import {
  BookingRequest,
  EncryptedMessage,
  ScheduleSlot,
  TutorProfile,
  TutorProfileEvent,
  TutorScheduleEvent
} from "../types/nostr";
import { formatDateTime } from "../utils/display";
import { BookingRequestForm } from "./BookingRequestForm";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { TutorCard } from "./TutorCard";

type DiscoverTabProps = {
  selectedTutor: TutorProfileEvent | null;
  onSelectTutor: (entry: TutorProfileEvent | null) => void;
  profile: TutorProfile;
  subjectFilter: string;
  onSubjectFilterChange: (value: string) => void;
  filteredTutors: TutorProfileEvent[];
  schedules: Record<string, TutorScheduleEvent>;
  discoverStatus: string;
  onRequestPublishedSlot: (tutorPubkey: string, slot: ScheduleSlot) => void;
  messagesByCounterparty: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
  studentNpub: string;
  onBookingRequest: (
    tutorPubkey: string,
    payload: Omit<BookingRequest, "bookingId">
  ) => void;
};

export function DiscoverTab({
  selectedTutor,
  onSelectTutor,
  profile,
  subjectFilter,
  onSubjectFilterChange,
  filteredTutors,
  schedules,
  discoverStatus,
  onRequestPublishedSlot,
  messagesByCounterparty,
  onSendMessage,
  messageStatus,
  studentNpub,
  onBookingRequest
}: DiscoverTabProps) {
  if (selectedTutor) {
    return (
      <section className="tab-panel discover-tab">
        <div className="stack">
          <button
            type="button"
            className="ghost"
            onClick={() => onSelectTutor(null)}
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
                  {schedules[selectedTutor.pubkey].schedule.slots.map((slot, index) => (
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
                            onRequestPublishedSlot(selectedTutor.pubkey, slot)
                          }
                        >
                          Request this slot
                        </button>
                      </div>
                    </li>
                  ))}
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
              onSend={(text) => onSendMessage(selectedTutor.pubkey, text)}
            />
            {messageStatus ? <p className="muted">{messageStatus}</p> : null}
          </article>
          <BookingRequestForm
            tutorPubkey={selectedTutor.pubkey}
            schedule={schedules[selectedTutor.pubkey]}
            studentNpub={studentNpub}
            onSubmit={(payload) => onBookingRequest(selectedTutor.pubkey, payload)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="tab-panel discover-tab">
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
            onChange={(event) => onSubjectFilterChange(event.target.value)}
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
                onSelect={(next) => onSelectTutor(next)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
