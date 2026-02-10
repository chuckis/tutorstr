import { useState } from "react";
import {
  BookingRequestEvent,
  BookingStatusEvent,
  EncryptedMessage,
  ProgressEntryEvent,
  TutorProfileEvent,
  TutorScheduleEvent
} from "../types/nostr";
import { TutorCard } from "./TutorCard";
import { TutorProfileView } from "./TutorProfileView";

type DirectoryProps = {
  entries: TutorProfileEvent[];
  subjectFilter: string;
  onFilterChange: (value: string) => void;
  schedules: Record<string, TutorScheduleEvent>;
  studentNpub: string;
  myRequests: BookingRequestEvent[];
  statuses: Record<string, BookingStatusEvent>;
  onRequest: (
    tutorPubkey: string,
    payload: Omit<BookingRequestEvent["request"], "bookingId">
  ) => void;
  messagesByTutor: Record<string, EncryptedMessage[]>;
  onSendMessage: (tutorPubkey: string, text: string) => void;
  progressByTutor: Record<string, ProgressEntryEvent[]>;
  onSendProgress: (tutorPubkey: string, entry: ProgressEntryEvent["entry"]) => void;
};

export function Directory({
  entries,
  subjectFilter,
  onFilterChange,
  schedules,
  studentNpub,
  myRequests,
  statuses,
  onRequest,
  messagesByTutor,
  onSendMessage,
  progressByTutor,
  onSendProgress
}: DirectoryProps) {
  const [selectedTutor, setSelectedTutor] = useState<TutorProfileEvent | null>(
    null
  );

  if (selectedTutor) {
    return (
      <TutorProfileView
        entry={selectedTutor}
        schedule={schedules[selectedTutor.pubkey]}
        onBack={() => setSelectedTutor(null)}
        studentNpub={studentNpub}
        myRequests={myRequests}
        statuses={statuses}
        onRequest={(payload) => onRequest(selectedTutor.pubkey, payload)}
        messages={messagesByTutor[selectedTutor.pubkey] || []}
        onSendMessage={(text) => onSendMessage(selectedTutor.pubkey, text)}
        progressEntries={progressByTutor[selectedTutor.pubkey] || []}
        onSendProgress={(entry) => onSendProgress(selectedTutor.pubkey, entry)}
      />
    );
  }

  return (
    <div className="directory">
      <label className="filter">
        Filter by subject
        <input
          value={subjectFilter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="calculus"
        />
      </label>

      <div className="card-grid">
        {entries.length === 0 ? (
          <p className="muted">No tutors found yet.</p>
        ) : (
          entries.map((entry) => (
            <TutorCard
              key={entry.pubkey}
              entry={entry}
              onSelect={setSelectedTutor}
            />
          ))
        )}
      </div>
    </div>
  );
}
