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
