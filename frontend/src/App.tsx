import { useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import "./App.css";
import { BookingRequestForm } from "./components/BookingRequestForm";
import { IdentityCard } from "./components/IdentityCard";
import { ProfileForm } from "./components/ProfileForm";
import { ScheduleForm } from "./components/ScheduleForm";
import { TutorCard } from "./components/TutorCard";
import { useBookingActions } from "./hooks/useBookingActions";
import { useBookingRequestsForTutor } from "./hooks/useBookingRequestsForTutor";
import { useBookingStatusesForUser } from "./hooks/useBookingStatusesForUser";
import { useLessonAgreementsForUser } from "./hooks/useLessonAgreementsForUser";
import { useMyBookingRequests } from "./hooks/useMyBookingRequests";
import { useNostrKeypair } from "./hooks/useNostrKeypair";
import { useTutorDirectory } from "./hooks/useTutorDirectory";
import { useTutorProfile } from "./hooks/useTutorProfile";
import { useTutorSchedule } from "./hooks/useTutorSchedule";
import { useTutorSchedules } from "./hooks/useTutorSchedules";
import { nostrClient } from "./nostr/client";
import {
  BookingRequestEvent,
  LessonAgreementEvent,
  LessonAgreementStatus,
  TutorProfileEvent
} from "./types/nostr";

type MainTab = "discover" | "requests" | "lessons" | "profile";
type RequestSegment = "incoming" | "outgoing";
type LessonSegment = "upcoming" | "past";

function toIsoDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toISOString();
}

function durationFromSlot(start: string, end: string) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return 60;
  }
  return Math.max(15, Math.round((endTime - startTime) / 60000));
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp);
}

function toDisplayId(pubkey: string) {
  if (!pubkey) {
    return "Unknown";
  }
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 16)}...`;
  } catch {
    return `${pubkey.slice(0, 12)}...`;
  }
}

function requestStatusLabel(status?: string) {
  if (!status) {
    return "pending";
  }
  if (status === "rejected") {
    return "declined";
  }
  return status;
}

function parseRelayList(value: string) {
  return value
    .split(",")
    .map((relay) => relay.trim())
    .filter(Boolean);
}

function loadLessonNote(lessonId: string, viewerPubkey: string) {
  return localStorage.getItem(`lesson-note:${lessonId}:${viewerPubkey}`) || "";
}

function saveLessonNote(lessonId: string, viewerPubkey: string, note: string) {
  localStorage.setItem(`lesson-note:${lessonId}:${viewerPubkey}`, note);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("discover");
  const [requestSegment, setRequestSegment] = useState<RequestSegment>("incoming");
  const [lessonSegment, setLessonSegment] = useState<LessonSegment>("upcoming");
  const [selectedTutor, setSelectedTutor] = useState<TutorProfileEvent | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonAgreementEvent | null>(
    null
  );
  const [relayInput, setRelayInput] = useState(nostrClient.getRelays().join(", "));
  const [relayStatus, setRelayStatus] = useState("");
  const [lessonNote, setLessonNote] = useState("");
  const keypair = useNostrKeypair();
  const { profile, setProfile, status, lastEventId, publishProfile } =
    useTutorProfile(keypair.pubkey);
  const { schedule, setSchedule, status: scheduleStatus, publishSchedule } =
    useTutorSchedule(keypair.pubkey);
  const { tutors, filteredTutors, subjectFilter, setSubjectFilter } =
    useTutorDirectory();
  const { schedules } = useTutorSchedules();
  const {
    publishBookingRequest,
    publishBookingStatus,
    publishLessonAgreement,
    updateLessonAgreementStatus
  } = useBookingActions();
  const { requests: incomingRequests } = useBookingRequestsForTutor(
    keypair.pubkey
  );
  const { statuses } = useBookingStatusesForUser(keypair.pubkey);
  const { requests: myRequests } = useMyBookingRequests(keypair.pubkey);
  const { list: lessonAgreements } = useLessonAgreementsForUser(keypair.pubkey);

  async function respondToBooking(
    request: BookingRequestEvent,
    nextStatus: "accepted" | "rejected"
  ) {
    await publishBookingStatus(request.pubkey, {
      bookingId: request.request.bookingId,
      status: nextStatus
    });

    if (nextStatus !== "accepted") {
      return;
    }

    await publishLessonAgreement(request.pubkey, {
      bookingEventId: request.eventId,
      lessonId: request.request.bookingId,
      bookingId: request.request.bookingId,
      subject: "Tutoring lesson",
      scheduledAt: toIsoDate(request.request.requestedSlot.start),
      durationMin: durationFromSlot(
        request.request.requestedSlot.start,
        request.request.requestedSlot.end
      ),
      price: profile.hourlyRate || 0,
      currency: "USD",
      status: "scheduled"
    });
  }

  async function changeLessonStatus(
    event: LessonAgreementEvent,
    nextStatus: LessonAgreementStatus
  ) {
    if (nextStatus !== "completed" && nextStatus !== "cancelled") {
      return;
    }
    await updateLessonAgreementStatus(event.studentPubkey, {
      bookingEventId: event.bookingEventId || "",
      ...event.agreement,
      status: nextStatus
    });
  }

  async function cancelRequestFromStudent(request: BookingRequestEvent) {
    await publishBookingStatus(request.tutorPubkey, {
      bookingId: request.request.bookingId,
      status: "cancelled"
    });
  }

  function updateRelays() {
    const parsed = parseRelayList(relayInput);
    if (parsed.length === 0) {
      setRelayStatus("Add at least one relay URL.");
      return;
    }
    nostrClient.setRelays(parsed);
    setRelayStatus("Relays updated.");
  }

  function logout() {
    nostrClient.clearStoredKeypair();
    window.location.reload();
  }

  function openLessonDetails(lesson: LessonAgreementEvent) {
    setSelectedLesson(lesson);
    setLessonNote(loadLessonNote(lesson.lessonId, keypair.pubkey));
  }

  function submitLessonNote() {
    if (!selectedLesson) {
      return;
    }
    saveLessonNote(selectedLesson.lessonId, keypair.pubkey, lessonNote);
  }

  const lessonBuckets = useMemo(() => {
    const now = Date.now();
    const upcoming: LessonAgreementEvent[] = [];
    const past: LessonAgreementEvent[] = [];
    lessonAgreements.forEach((event) => {
      const startsAt = Date.parse(event.agreement.scheduledAt);
      const isFuture = !Number.isNaN(startsAt) && startsAt >= now;
      const isScheduled = event.agreement.status === "scheduled";
      if (isScheduled && isFuture) {
        upcoming.push(event);
        return;
      }
      past.push(event);
    });
    return { upcoming, past };
  }, [lessonAgreements]);

  const requestItems = requestSegment === "incoming" ? incomingRequests : myRequests;

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Tutorstr</h1>
        <p className="muted">Nostr tutor hub</p>
      </header>

      <section className="screen">
        <IdentityCard npub={keypair.npub} />

        {activeTab === "discover" ? (
          <section className="tab-panel">
            {selectedTutor ? (
              <div className="stack">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedTutor(null)}
                >
                  Back to discover
                </button>
                <article className="panel">
                  <h2>{selectedTutor.profile.name || "Unnamed Tutor"}</h2>
                  <p>{selectedTutor.profile.bio || "No bio provided yet."}</p>
                  <div className="chips">
                    {selectedTutor.profile.subjects.map((subject) => (
                      <span key={subject}>{subject}</span>
                    ))}
                  </div>
                  <p className="muted">
                    Rate:{" "}
                    {selectedTutor.profile.hourlyRate
                      ? `$${selectedTutor.profile.hourlyRate}/hr`
                      : "Not set"}
                  </p>
                </article>
                <BookingRequestForm
                  tutorPubkey={selectedTutor.pubkey}
                  schedule={schedules[selectedTutor.pubkey]}
                  studentNpub={keypair.npub}
                  onSubmit={(payload) =>
                    publishBookingRequest(selectedTutor.pubkey, payload)
                  }
                />
              </div>
            ) : (
              <div className="stack">
                <article className="panel">
                  <h2>Public profile preview</h2>
                  <p>
                    <strong>{profile.name || "Unnamed Tutor"}</strong>
                  </p>
                  <p className="muted">{profile.bio || "No bio provided."}</p>
                  <button type="button" onClick={() => setActiveTab("profile")}>
                    Edit profile
                  </button>
                </article>

                <label className="filter">
                  Search tutors by subject
                  <input
                    value={subjectFilter}
                    onChange={(event) => setSubjectFilter(event.target.value)}
                    placeholder="calculus"
                  />
                </label>

                <div className="card-grid">
                  {filteredTutors.length === 0 ? (
                    <p className="muted">No tutors found yet.</p>
                  ) : (
                    filteredTutors.map((entry) => (
                      <TutorCard
                        key={entry.pubkey}
                        entry={entry}
                        onSelect={setSelectedTutor}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "requests" ? (
          <section className="tab-panel">
            <div className="segmented">
              <button
                type="button"
                className={requestSegment === "incoming" ? "active" : ""}
                onClick={() => setRequestSegment("incoming")}
              >
                Incoming
              </button>
              <button
                type="button"
                className={requestSegment === "outgoing" ? "active" : ""}
                onClick={() => setRequestSegment("outgoing")}
              >
                Outgoing
              </button>
            </div>

            {requestItems.length === 0 ? (
              <p className="muted">No requests in this segment.</p>
            ) : (
              <ul className="requests-list">
                {requestItems.map((request) => {
                  const statusRaw = statuses[request.request.bookingId]?.status.status;
                  const statusText = requestStatusLabel(statusRaw);
                  const isPending = !statusRaw;
                  const counterparty =
                    requestSegment === "incoming"
                      ? request.request.studentNpub
                      : tutors[request.tutorPubkey]?.profile.name ||
                        toDisplayId(request.tutorPubkey);

                  return (
                    <li key={request.id}>
                      <div>
                        <strong>Subject:</strong> Tutoring lesson
                      </div>
                      <div>
                        <strong>Scheduled:</strong>{" "}
                        {formatDateTime(request.request.requestedSlot.start)}
                      </div>
                      <div>
                        <strong>Counterparty:</strong> {counterparty}
                      </div>
                      <div className="request-actions">
                        <span className={`status-pill status-${statusText}`}>
                          {statusText}
                        </span>
                        {requestSegment === "incoming" && isPending ? (
                          <div className="action-buttons">
                            <button
                              type="button"
                              onClick={() => respondToBooking(request, "accepted")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="ghost-action"
                              onClick={() => respondToBooking(request, "rejected")}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                        {requestSegment === "outgoing" && isPending ? (
                          <button
                            type="button"
                            className="ghost-action"
                            onClick={() => cancelRequestFromStudent(request)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {activeTab === "lessons" ? (
          <section className="tab-panel">
            {selectedLesson ? (
              <article className="panel details-screen">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedLesson(null)}
                >
                  Back to lessons
                </button>
                <h2>{selectedLesson.agreement.subject || "Lesson"}</h2>
                <p>
                  <strong>Date/time:</strong>{" "}
                  {formatDateTime(selectedLesson.agreement.scheduledAt)}
                </p>
                <p>
                  <strong>Duration:</strong> {selectedLesson.agreement.durationMin} min
                </p>
                <p>
                  <strong>Counterparty:</strong>{" "}
                  {selectedLesson.tutorPubkey === keypair.pubkey
                    ? tutors[selectedLesson.studentPubkey]?.profile.name ||
                      toDisplayId(selectedLesson.studentPubkey)
                    : tutors[selectedLesson.tutorPubkey]?.profile.name ||
                      toDisplayId(selectedLesson.tutorPubkey)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`status-pill status-${selectedLesson.agreement.status}`}
                  >
                    {selectedLesson.agreement.status}
                  </span>
                </p>

                {selectedLesson.tutorPubkey === keypair.pubkey &&
                selectedLesson.agreement.status === "scheduled" ? (
                  <div className="action-buttons">
                    <button
                      type="button"
                      onClick={() =>
                        changeLessonStatus(selectedLesson, "completed").then(() =>
                          setSelectedLesson(null)
                        )
                      }
                    >
                      Mark completed
                    </button>
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() =>
                        changeLessonStatus(selectedLesson, "cancelled").then(() =>
                          setSelectedLesson(null)
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                {selectedLesson.studentPubkey === keypair.pubkey ? (
                  <div className="stack">
                    {selectedLesson.agreement.status === "scheduled" ? (
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() =>
                          changeLessonStatus(selectedLesson, "cancelled").then(() =>
                            setSelectedLesson(null)
                          )
                        }
                      >
                        Cancel lesson
                      </button>
                    ) : null}
                    <label className="filter">
                      Personal note (local only)
                      <textarea
                        rows={4}
                        value={lessonNote}
                        onChange={(event) => setLessonNote(event.target.value)}
                      />
                    </label>
                    <button type="button" onClick={submitLessonNote}>
                      Save note
                    </button>
                  </div>
                ) : null}
              </article>
            ) : (
              <div className="stack">
                <div className="segmented">
                  <button
                    type="button"
                    className={lessonSegment === "upcoming" ? "active" : ""}
                    onClick={() => setLessonSegment("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    className={lessonSegment === "past" ? "active" : ""}
                    onClick={() => setLessonSegment("past")}
                  >
                    Past
                  </button>
                </div>
                <ul className="lesson-list">
                  {(lessonSegment === "upcoming"
                    ? lessonBuckets.upcoming
                    : lessonBuckets.past
                  ).map((agreementEvent) => {
                    const { agreement } = agreementEvent;
                    const counterparty =
                      agreementEvent.tutorPubkey === keypair.pubkey
                        ? agreementEvent.studentPubkey
                        : agreementEvent.tutorPubkey;
                    const name =
                      tutors[counterparty]?.profile.name || toDisplayId(counterparty);
                    return (
                      <li
                        key={agreementEvent.lessonId}
                        className="lesson-card"
                        onClick={() => openLessonDetails(agreementEvent)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openLessonDetails(agreementEvent);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <strong>{agreement.subject || "Lesson"}</strong>
                        </div>
                        <div>{formatDateTime(agreement.scheduledAt)}</div>
                        <div>{name}</div>
                        <span className={`status-pill status-${agreement.status}`}>
                          {agreement.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {(lessonSegment === "upcoming"
                  ? lessonBuckets.upcoming
                  : lessonBuckets.past
                ).length === 0 ? (
                  <p className="muted">No lessons in this segment.</p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "profile" ? (
          <section className="tab-panel">
            <ProfileForm
              profile={profile}
              onChange={setProfile}
              onSubmit={() => publishProfile(profile)}
            />
            <ScheduleForm
              schedule={schedule}
              onChange={setSchedule}
              onSubmit={() => publishSchedule(schedule)}
            />

            <article className="panel">
              <h3>Relay configuration</h3>
              <label className="filter">
                Relays (comma-separated)
                <textarea
                  rows={3}
                  value={relayInput}
                  onChange={(event) => setRelayInput(event.target.value)}
                />
              </label>
              <button type="button" onClick={updateRelays}>
                Save relays
              </button>
              {relayStatus ? <p className="muted">{relayStatus}</p> : null}
            </article>

            <article className="panel">
              <h3>Session</h3>
              <button type="button" className="ghost-action" onClick={logout}>
                Logout
              </button>
            </article>

            <div className="status">
              <span>{scheduleStatus || status}</span>
              {lastEventId ? (
                <span className="muted">Last event: {lastEventId}</span>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        <button
          type="button"
          className={activeTab === "discover" ? "active" : ""}
          onClick={() => {
            setActiveTab("discover");
            setSelectedLesson(null);
          }}
        >
          Discover
        </button>
        <button
          type="button"
          className={activeTab === "requests" ? "active" : ""}
          onClick={() => {
            setActiveTab("requests");
            setSelectedLesson(null);
          }}
        >
          Requests
        </button>
        <button
          type="button"
          className={activeTab === "lessons" ? "active" : ""}
          onClick={() => setActiveTab("lessons")}
        >
          Lessons
        </button>
        <button
          type="button"
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => {
            setActiveTab("profile");
            setSelectedLesson(null);
          }}
        >
          Profile
        </button>
      </nav>
    </main>
  );
}
