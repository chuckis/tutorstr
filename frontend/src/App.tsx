import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { BottomNav } from "./components/BottomNav";
import { DiscoverTab } from "./components/DiscoverTab";
import { LessonsTab } from "./components/LessonsTab";
import { ProfileTab } from "./components/ProfileTab";
import { RequestsTab } from "./components/RequestsTab";
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
import { toDisplayId } from "./utils/display";

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
          <DiscoverTab
            selectedTutor={selectedTutor}
            onSelectTutor={setSelectedTutor}
            profile={profile}
            subjectFilter={subjectFilter}
            onSubjectFilterChange={setSubjectFilter}
            filteredTutors={filteredTutors}
            schedules={schedules}
            discoverStatus={discoverStatus}
            onRequestPublishedSlot={requestPublishedSlot}
            messagesByCounterparty={messagesByCounterparty}
            onSendMessage={sendEncryptedMessage}
            messageStatus={messageStatus}
            studentNpub={keypair.npub}
            onBookingRequest={(tutorPubkey, payload) =>
              publishBookingRequest(tutorPubkey, payload)
            }
          />
        ) : null}

        {activeTab === "requests" ? (
          <RequestsTab
            selectedRequest={selectedRequest}
            onSelectRequest={setSelectedRequest}
            requestSegment={requestSegment}
            onRequestSegmentChange={setRequestSegment}
            requestItems={requestItems}
            statuses={statuses}
            tutors={tutors}
            onRespondToBooking={respondToBooking}
            onCancelRequest={cancelRequestFromStudent}
            messagesByCounterparty={messagesByCounterparty}
            onSendMessage={sendEncryptedMessage}
            messageStatus={messageStatus}
          />
        ) : null}

        {activeTab === "lessons" ? (
          <LessonsTab
            selectedLesson={selectedLesson}
            onSelectLesson={(lesson) => {
              if (!lesson) {
                setSelectedLesson(null);
                return;
              }
              openLessonDetails(lesson);
            }}
            lessonSegment={lessonSegment}
            onLessonSegmentChange={setLessonSegment}
            lessonBuckets={lessonBuckets}
            currentPubkey={keypair.pubkey}
            tutors={tutors}
            lessonNote={lessonNote}
            onLessonNoteChange={setLessonNote}
            onSubmitLessonNote={submitLessonNote}
            onChangeLessonStatus={changeLessonStatus}
            messagesByCounterparty={messagesByCounterparty}
            onSendMessage={sendEncryptedMessage}
            messageStatus={messageStatus}
          />
        ) : null}

        {activeTab === "profile" ? (
          <ProfileTab
            npub={keypair.npub}
            pubkey={keypair.pubkey}
            profile={profile}
            onProfileChange={setProfile}
            onPublishProfile={() => publishProfile(profile)}
            schedule={schedule}
            onScheduleChange={setSchedule}
            onPublishSchedule={() => publishSchedule(schedule)}
            relayInput={relayInput}
            onRelayInputChange={setRelayInput}
            relayStatus={relayStatus}
            onUpdateRelays={updateRelays}
            onLogout={logout}
            scheduleStatus={scheduleStatus}
            profileStatus={status}
            lastEventId={lastEventId}
          />
        ) : null}
      </section>

      <BottomNav
        activeTab={activeTab}
        requestsHasAlert={requestsHasAlert}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "discover" || tab === "profile") {
            setSelectedLesson(null);
          }
          if (tab === "requests") {
            setSelectedLesson(null);
            setSelectedRequest(null);
          }
        }}
      />
    </main>
  );
}
