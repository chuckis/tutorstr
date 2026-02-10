import {
  BookingRequestEvent,
  BookingStatusEvent,
  EncryptedMessage,
  ProgressEntryEvent,
  TutorProfileEvent,
  TutorScheduleEvent
} from "../types/nostr";
import { BookingRequestForm } from "./BookingRequestForm";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { MyBookingRequests } from "./MyBookingRequests";
import { ProgressEntryForm } from "./ProgressEntryForm";
import { ProgressEntryList } from "./ProgressEntryList";

type TutorProfileViewProps = {
  entry: TutorProfileEvent;
  schedule?: TutorScheduleEvent;
  onBack: () => void;
  studentNpub: string;
  onRequest: (
    payload: Omit<BookingRequestEvent["request"], "bookingId">
  ) => void;
  myRequests: BookingRequestEvent[];
  statuses: Record<string, BookingStatusEvent>;
  messages: EncryptedMessage[];
  onSendMessage: (text: string) => void;
  progressEntries: ProgressEntryEvent[];
  onSendProgress: (entry: ProgressEntryEvent["entry"]) => void;
};

export function TutorProfileView({
  entry,
  schedule,
  onBack,
  studentNpub,
  onRequest,
  myRequests,
  statuses,
  messages,
  onSendMessage,
  progressEntries,
  onSendProgress
}: TutorProfileViewProps) {
  return (
    <div className="profile-view">
      <button type="button" className="ghost" onClick={onBack}>
        Back to directory
      </button>
      <h2>{entry.profile.name || "Unnamed Tutor"}</h2>
      <p>{entry.profile.bio || "No bio provided yet."}</p>
      <div className="chips">
        {entry.profile.subjects.map((subject) => (
          <span key={subject}>{subject}</span>
        ))}
      </div>
      <div className="meta">
        <span>
          Languages: {entry.profile.languages.join(", ") || "—"}
        </span>
        <span>
          Rate:{" "}
          {entry.profile.hourlyRate
            ? `$${entry.profile.hourlyRate}/hr`
            : "—"}
        </span>
      </div>
      <div className="schedule-view">
        <h3>Availability</h3>
        {schedule?.schedule.slots.length ? (
          <ul>
            {schedule.schedule.slots.map((slot, index) => (
              <li key={`${slot.start}-${index}`}>
                {slot.start} → {slot.end}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No schedule published yet.</p>
        )}
      </div>
      <BookingRequestForm
        tutorPubkey={entry.pubkey}
        schedule={schedule}
        studentNpub={studentNpub}
        onSubmit={onRequest}
      />
      <div className="private-panel">
        <h3>Private messages</h3>
        <MessageThread messages={messages} />
        <MessageComposer onSend={onSendMessage} />
      </div>
      <div className="private-panel">
        <ProgressEntryForm onSubmit={onSendProgress} />
        <ProgressEntryList entries={progressEntries} />
      </div>
      <MyBookingRequests
        requests={myRequests}
        statuses={statuses}
        tutorPubkey={entry.pubkey}
      />
    </div>
  );
}
