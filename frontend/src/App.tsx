import { useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import "./App.css";
import { BookingRequestForm } from "./components/BookingRequestForm";
import { MessageComposer } from "./components/MessageComposer";
import { MessageThread } from "./components/MessageThread";
import { ProfileForm } from "./components/ProfileForm";
import { ScheduleForm } from "./components/ScheduleForm";
import { TutorCard } from "./components/TutorCard";
import { useBookingActions } from "./hooks/useBookingActions";
import { useBookingRequestsForTutor } from "./hooks/useBookingRequestsForTutor";
import { useBookingStatusesForUser } from "./hooks/useBookingStatusesForUser";
import { useEncryptedMessages } from "./hooks/useEncryptedMessages";
import { useLessonAgreementsForUser } from "./hooks/useLessonAgreementsForUser";
import { useMyBookingRequests } from "./hooks/useMyBookingRequests";
import { useNostrKeypair } from "./hooks/useNostrKeypair";
import { usePrivateMessagingActions } from "./hooks/usePrivateMessagingActions";
import { useTutorDirectory } from "./hooks/useTutorDirectory";
import { useTutorProfile } from "./hooks/useTutorProfile";
import { useTutorSchedule } from "./hooks/useTutorSchedule";
import { useTutorSchedules } from "./hooks/useTutorSchedules";
import { nostrClient } from "./nostr/client";
import {
  BookingRequestEvent,
  LessonAgreementEvent,
  LessonAgreementStatus,
  ScheduleSlot,
  TutorProfileEvent
} from "./types/nostr";

type MainTab = "discover" | "requests" | "lessons" | "profile";
type RequestSegment = "incoming" | "outgoing";
type LessonSegment = "upcoming" | "past";
const REQUESTS_SEEN_STORAGE = "tutorhub:requests-seen";
const MESSAGES_SEEN_STORAGE = "tutorhub:messages-seen";

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
  const [selectedRequest, setSelectedRequest] = useState<{
    request: BookingRequestEvent;
    segment: RequestSegment;
  } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonAgreementEvent | null>(
    null
  );
  const [relayInput, setRelayInput] = useState(nostrClient.getRelays().join(", "));
  const [relayStatus, setRelayStatus] = useState("");
  const [lessonNote, setLessonNote] = useState("");
  const [discoverStatus, setDiscoverStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [lastSeenRequestTs, setLastSeenRequestTs] = useState<number>(() =>
    Number(localStorage.getItem(`${REQUESTS_SEEN_STORAGE}:${nostrClient.getOrCreateKeypair().pubkey}`) || "0")
  );
  const [lastSeenMessageTs, setLastSeenMessageTs] = useState<number>(() =>
    Number(localStorage.getItem(`${MESSAGES_SEEN_STORAGE}:${nostrClient.getOrCreateKeypair().pubkey}`) || "0")
  );
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
  const { messages, byCounterparty: messagesByCounterparty } = useEncryptedMessages(
    keypair.pubkey
  );
  const { sendMessage } = usePrivateMessagingActions();

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

  async function requestPublishedSlot(tutorPubkey: string, slot: ScheduleSlot) {
    setDiscoverStatus("");
    try {
      await publishBookingRequest(tutorPubkey, {
        requestedSlot: slot,
        message: "",
        studentNpub: keypair.npub
      });
      setDiscoverStatus("Slot request sent.");
    } catch (error) {
      setDiscoverStatus(
        error instanceof Error ? error.message : "Failed to send slot request."
      );
    }
  }

  async function sendEncryptedMessage(recipientPubkey: string, text: string) {
    setMessageStatus("");
    try {
      await sendMessage(recipientPubkey, text);
    } catch (error) {
      setMessageStatus(
        error instanceof Error ? error.message : "Failed to send message."
      );
    }
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
      const isFutureOrUnknown = Number.isNaN(startsAt) || startsAt >= now;
      const isScheduled = event.agreement.status === "scheduled";
      if (isScheduled && isFutureOrUnknown) {
        upcoming.push(event);
        return;
      }
      past.push(event);
    });
    return { upcoming, past };
  }, [lessonAgreements]);

  const requestItems = requestSegment === "incoming" ? incomingRequests : myRequests;
  const viewerLabel = profile.name.trim() || toDisplayId(keypair.pubkey);
  const latestIncomingRequestTs = useMemo(
    () => incomingRequests.reduce((max, item) => Math.max(max, item.created_at), 0),
    [incomingRequests]
  );
  const latestIncomingMessageTs = useMemo(
    () =>
      messages
        .filter((item) => item.pubkey !== keypair.pubkey)
        .reduce((max, item) => Math.max(max, item.created_at), 0),
    [messages, keypair.pubkey]
  );
  const requestsHasAlert =
    latestIncomingRequestTs > lastSeenRequestTs ||
    latestIncomingMessageTs > lastSeenMessageTs;

  useEffect(() => {
    if (activeTab !== "requests") {
      return;
    }
    if (latestIncomingRequestTs > lastSeenRequestTs) {
      setLastSeenRequestTs(latestIncomingRequestTs);
      localStorage.setItem(
        `${REQUESTS_SEEN_STORAGE}:${keypair.pubkey}`,
        String(latestIncomingRequestTs)
      );
    }
    if (latestIncomingMessageTs > lastSeenMessageTs) {
      setLastSeenMessageTs(latestIncomingMessageTs);
      localStorage.setItem(
        `${MESSAGES_SEEN_STORAGE}:${keypair.pubkey}`,
        String(latestIncomingMessageTs)
      );
    }
  }, [
    activeTab,
    keypair.pubkey,
    lastSeenMessageTs,
    lastSeenRequestTs,
    latestIncomingMessageTs,
    latestIncomingRequestTs
  ]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Tutorstr</h1>
        <div className="topbar-meta">
          <p className="muted">Nostr tutor hub</p>
          <span className="topbar-identity">{viewerLabel}</span>
        </div>
      </header>

      <section className="screen">
        {activeTab === "discover" ? (
          <section className="tab-panel discover-tab">
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
                  <div className="stack">
                    <h3>Published slots</h3>
                    {schedules[selectedTutor.pubkey]?.schedule.slots.length ? (
                      <ul className="slot-list">
                        {schedules[selectedTutor.pubkey].schedule.slots.map(
                          (slot, index) => (
                            <li key={`${slot.start}-${index}`}>
                              <div className="request-actions">
                                <span>
                                  {formatDateTime(slot.start)}
                                  {" -> "}
                                  {formatDateTime(slot.end)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestPublishedSlot(selectedTutor.pubkey, slot)
                                  }
                                >
                                  Request this slot
                                </button>
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="muted">No slots published yet.</p>
                    )}
                    {discoverStatus ? <p className="muted">{discoverStatus}</p> : null}
                  </div>
                </article>
                <article className="panel">
                  <h3>Encrypted messages</h3>
                  <MessageThread
                    messages={messagesByCounterparty[selectedTutor.pubkey] || []}
                  />
                  <MessageComposer
                    onSend={(text) => sendEncryptedMessage(selectedTutor.pubkey, text)}
                  />
                  {messageStatus ? <p className="muted">{messageStatus}</p> : null}
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
          <section className="tab-panel requests-tab">
            {selectedRequest ? (
              <article className="panel details-screen">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedRequest(null)}
                >
                  Back to requests
                </button>
                <h2>Accepted lesson request</h2>
                <p>
                  <strong>Scheduled:</strong>{" "}
                  {formatDateTime(selectedRequest.request.request.requestedSlot.start)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {requestStatusLabel(
                    statuses[selectedRequest.request.request.bookingId]?.status.status
                  )}
                </p>
                <div className="stack">
                  <h3>Encrypted messages</h3>
                  <MessageThread
                    messages={
                      messagesByCounterparty[
                        selectedRequest.segment === "incoming"
                          ? selectedRequest.request.pubkey
                          : selectedRequest.request.tutorPubkey
                      ] || []
                    }
                  />
                  <MessageComposer
                    onSend={(text) =>
                      sendEncryptedMessage(
                        selectedRequest.segment === "incoming"
                          ? selectedRequest.request.pubkey
                          : selectedRequest.request.tutorPubkey,
                        text
                      )
                    }
                  />
                  {messageStatus ? <p className="muted">{messageStatus}</p> : null}
                </div>
              </article>
            ) : (
              <>
                <div className="segmented">
                  <button
                    type="button"
                    className={requestSegment === "incoming" ? "active" : ""}
                    onClick={() => {
                      setRequestSegment("incoming");
                      setSelectedRequest(null);
                    }}
                  >
                    Incoming
                  </button>
                  <button
                    type="button"
                    className={requestSegment === "outgoing" ? "active" : ""}
                    onClick={() => {
                      setRequestSegment("outgoing");
                      setSelectedRequest(null);
                    }}
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
                            {statusRaw === "accepted" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRequest({
                                    request,
                                    segment: requestSegment
                                  })
                                }
                              >
                                Details
                              </button>
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
              </>
            )}
          </section>
        ) : null}

        {activeTab === "lessons" ? (
          <section className="tab-panel lessons-tab">
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
                <div className="stack">
                  <h3>Encrypted messages</h3>
                  <MessageThread
                    messages={
                      messagesByCounterparty[
                        selectedLesson.tutorPubkey === keypair.pubkey
                          ? selectedLesson.studentPubkey
                          : selectedLesson.tutorPubkey
                      ] || []
                    }
                  />
                  <MessageComposer
                    onSend={(text) =>
                      sendEncryptedMessage(
                        selectedLesson.tutorPubkey === keypair.pubkey
                          ? selectedLesson.studentPubkey
                          : selectedLesson.tutorPubkey,
                        text
                      )
                    }
                  />
                  {messageStatus ? <p className="muted">{messageStatus}</p> : null}
                </div>
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
          <section className="tab-panel profile-tab">
            <article className="panel">
              <h3>Identity</h3>
              <p className="muted">npub</p>
              <p className="identity-value">{keypair.npub}</p>
              <p className="muted">pubkey (hex)</p>
              <p className="identity-value">{keypair.pubkey}</p>
            </article>

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
          className={`${activeTab === "requests" ? "active" : ""} ${
            requestsHasAlert ? "has-alert" : ""
          }`.trim()}
          onClick={() => {
            setActiveTab("requests");
            setSelectedLesson(null);
            setSelectedRequest(null);
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
