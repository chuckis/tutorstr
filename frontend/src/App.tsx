import { useState } from "react";
import "./App.css";
import { Directory } from "./components/Directory";
import { IdentityCard } from "./components/IdentityCard";
import { ProfileForm } from "./components/ProfileForm";
import { ScheduleForm } from "./components/ScheduleForm";
import { Tabs } from "./components/Tabs";
import { BookingRequestsPanel } from "./components/BookingRequestsPanel";
import { LessonAgreementsPanel } from "./components/LessonAgreementsPanel";
import { useBookingActions } from "./hooks/useBookingActions";
import { useBookingRequestsForTutor } from "./hooks/useBookingRequestsForTutor";
import { useBookingStatusesForUser } from "./hooks/useBookingStatusesForUser";
import { useLessonAgreementsForUser } from "./hooks/useLessonAgreementsForUser";
import { useMyBookingRequests } from "./hooks/useMyBookingRequests";
import { useNostrKeypair } from "./hooks/useNostrKeypair";
import { useEncryptedMessages } from "./hooks/useEncryptedMessages";
import { useProgressEntries } from "./hooks/useProgressEntries";
import { usePrivateMessagingActions } from "./hooks/usePrivateMessagingActions";
import { useTutorDirectory } from "./hooks/useTutorDirectory";
import { useTutorProfile } from "./hooks/useTutorProfile";
import { useTutorSchedule } from "./hooks/useTutorSchedule";
import { useTutorSchedules } from "./hooks/useTutorSchedules";
import {
  BookingRequestEvent,
  LessonAgreementEvent,
  LessonAgreementStatus
} from "./types/nostr";

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

export default function App() {
  const [activeView, setActiveView] = useState<"directory" | "profile">(
    "directory"
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
  const { byCounterparty: messagesByTutor } = useEncryptedMessages(
    keypair.pubkey
  );
  const { byCounterparty: progressByTutor } = useProgressEntries(
    keypair.pubkey
  );
  const { sendMessage, sendProgressEntry } = usePrivateMessagingActions();

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

  return (
    <main className="app">
      <section className="card">
        <h1>Tutorstr</h1>
        <p className="muted">Tutor Hub MVP console.</p>

        <Tabs active={activeView} onChange={setActiveView} />

        <IdentityCard npub={keypair.npub} />
        <LessonAgreementsPanel
          title="Lesson dashboard"
          currentPubkey={keypair.pubkey}
          agreements={lessonAgreements}
          profilesByPubkey={tutors}
          onStatusChange={changeLessonStatus}
        />

        {activeView === "directory" ? (
          <Directory
            entries={filteredTutors}
            subjectFilter={subjectFilter}
            onFilterChange={setSubjectFilter}
            schedules={schedules}
            studentNpub={keypair.npub}
            myRequests={myRequests}
            statuses={statuses}
            onRequest={(tutorPubkey, payload) =>
              publishBookingRequest(tutorPubkey, payload)
            }
            messagesByTutor={messagesByTutor}
            onSendMessage={sendMessage}
            progressByTutor={progressByTutor}
            onSendProgress={sendProgressEntry}
          />
        ) : (
          <>
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
            <BookingRequestsPanel
              requests={incomingRequests}
              statuses={statuses}
              onRespond={respondToBooking}
            />
            <div className="requests-panel">
              <h3>Private messages</h3>
              <p className="muted">
                Messages are encrypted (NIP-04) and only readable by participants.
              </p>
              {Object.entries(messagesByTutor).length === 0 ? (
                <p className="muted">No messages yet.</p>
              ) : (
                <ul>
                  {Object.entries(messagesByTutor).map(([counterparty, list]) => (
                    <li key={counterparty}>
                      <strong>{counterparty}</strong>
                      <div className="muted">
                        {list[list.length - 1]?.content || "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="requests-panel">
              <h3>Progress logs</h3>
              <p className="muted">
                Encrypted kind 30004 entries sent by students.
              </p>
              {Object.entries(progressByTutor).length === 0 ? (
                <p className="muted">No progress entries yet.</p>
              ) : (
                <ul>
                  {Object.entries(progressByTutor).map(([counterparty, list]) => (
                    <li key={counterparty}>
                      <strong>{counterparty}</strong>
                      <div className="muted">
                        {list[0]?.entry.topic || "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="status">
          <span>{scheduleStatus || status}</span>
          {lastEventId ? (
            <span className="muted">Last event: {lastEventId}</span>
          ) : null}
        </div>
      </section>
    </main>
  );
}
