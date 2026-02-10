import { useState } from "react";
import "./App.css";
import { Directory } from "./components/Directory";
import { IdentityCard } from "./components/IdentityCard";
import { ProfileForm } from "./components/ProfileForm";
import { ScheduleForm } from "./components/ScheduleForm";
import { Tabs } from "./components/Tabs";
import { BookingRequestsPanel } from "./components/BookingRequestsPanel";
import { useBookingActions } from "./hooks/useBookingActions";
import { useBookingRequestsForTutor } from "./hooks/useBookingRequestsForTutor";
import { useBookingStatusesForUser } from "./hooks/useBookingStatusesForUser";
import { useMyBookingRequests } from "./hooks/useMyBookingRequests";
import { useNostrKeypair } from "./hooks/useNostrKeypair";
import { useEncryptedMessages } from "./hooks/useEncryptedMessages";
import { useProgressEntries } from "./hooks/useProgressEntries";
import { usePrivateMessagingActions } from "./hooks/usePrivateMessagingActions";
import { useTutorDirectory } from "./hooks/useTutorDirectory";
import { useTutorProfile } from "./hooks/useTutorProfile";
import { useTutorSchedule } from "./hooks/useTutorSchedule";
import { useTutorSchedules } from "./hooks/useTutorSchedules";

export default function App() {
  const [activeView, setActiveView] = useState<"directory" | "profile">(
    "directory"
  );
  const keypair = useNostrKeypair();
  const { profile, setProfile, status, lastEventId, publishProfile } =
    useTutorProfile(keypair.pubkey);
  const { schedule, setSchedule, status: scheduleStatus, publishSchedule } =
    useTutorSchedule(keypair.pubkey);
  const { filteredTutors, subjectFilter, setSubjectFilter } =
    useTutorDirectory();
  const { schedules } = useTutorSchedules();
  const { publishBookingRequest, publishBookingStatus } = useBookingActions();
  const { requests: incomingRequests } = useBookingRequestsForTutor(
    keypair.pubkey
  );
  const { statuses } = useBookingStatusesForUser(keypair.pubkey);
  const { requests: myRequests } = useMyBookingRequests(keypair.pubkey);
  const { byCounterparty: messagesByTutor } = useEncryptedMessages(
    keypair.pubkey
  );
  const { byCounterparty: progressByTutor } = useProgressEntries(
    keypair.pubkey
  );
  const { sendMessage, sendProgressEntry } = usePrivateMessagingActions();

  return (
    <main className="app">
      <section className="card">
        <h1>Tutorstr</h1>
        <p className="muted">Tutor Hub MVP console.</p>

        <Tabs active={activeView} onChange={setActiveView} />

        <IdentityCard npub={keypair.npub} />

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
              onRespond={(bookingId, studentPubkey, nextStatus) =>
                publishBookingStatus(studentPubkey, {
                  bookingId,
                  status: nextStatus
                })
              }
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
