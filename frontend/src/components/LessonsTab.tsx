import { LessonAgreementEvent, LessonAgreementStatus, TutorProfileEvent } from "../types/nostr";
import { formatDateTime, toDisplayId } from "../utils/display";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

type LessonSegment = "upcoming" | "past";

type LessonsTabProps = {
  selectedLesson: LessonAgreementEvent | null;
  onSelectLesson: (lesson: LessonAgreementEvent | null) => void;
  lessonSegment: LessonSegment;
  onLessonSegmentChange: (segment: LessonSegment) => void;
  lessonBuckets: {
    upcoming: LessonAgreementEvent[];
    past: LessonAgreementEvent[];
  };
  currentPubkey: string;
  tutors: Record<string, TutorProfileEvent>;
  lessonNote: string;
  onLessonNoteChange: (value: string) => void;
  onSubmitLessonNote: () => void;
  onChangeLessonStatus: (
    event: LessonAgreementEvent,
    nextStatus: LessonAgreementStatus
  ) => Promise<void>;
  messagesByCounterparty: Record<string, { id: string; created_at: number; pubkey: string; counterparty: string; content: string }[]>;
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
};

export function LessonsTab({
  selectedLesson,
  onSelectLesson,
  lessonSegment,
  onLessonSegmentChange,
  lessonBuckets,
  currentPubkey,
  tutors,
  lessonNote,
  onLessonNoteChange,
  onSubmitLessonNote,
  onChangeLessonStatus,
  messagesByCounterparty,
  onSendMessage,
  messageStatus
}: LessonsTabProps) {
  if (selectedLesson) {
    const counterpartyPubkey =
      selectedLesson.tutorPubkey === currentPubkey
        ? selectedLesson.studentPubkey
        : selectedLesson.tutorPubkey;

    return (
      <section className="tab-panel lessons-tab">
        <article className="panel details-screen">
          <button
            type="button"
            className="ghost"
            onClick={() => onSelectLesson(null)}
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
            {tutors[counterpartyPubkey]?.profile.name || toDisplayId(counterpartyPubkey)}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={`status-pill status-${selectedLesson.agreement.status}`}>
              {selectedLesson.agreement.status}
            </span>
          </p>

          {selectedLesson.tutorPubkey === currentPubkey &&
          selectedLesson.agreement.status === "scheduled" ? (
            <div className="action-buttons">
              <button
                type="button"
                onClick={() =>
                  onChangeLessonStatus(selectedLesson, "completed").then(() =>
                    onSelectLesson(null)
                  )
                }
              >
                Mark completed
              </button>
              <button
                type="button"
                className="ghost-action"
                onClick={() =>
                  onChangeLessonStatus(selectedLesson, "cancelled").then(() =>
                    onSelectLesson(null)
                  )
                }
              >
                Cancel
              </button>
            </div>
          ) : null}

          {selectedLesson.studentPubkey === currentPubkey ? (
            <div className="stack">
              {selectedLesson.agreement.status === "scheduled" ? (
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() =>
                    onChangeLessonStatus(selectedLesson, "cancelled").then(() =>
                      onSelectLesson(null)
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
                  onChange={(event) => onLessonNoteChange(event.target.value)}
                />
              </label>
              <button type="button" onClick={onSubmitLessonNote}>
                Save note
              </button>
            </div>
          ) : null}
          <div className="stack">
            <h3>Encrypted messages</h3>
            <MessageThread messages={messagesByCounterparty[counterpartyPubkey] || []} />
            <MessageComposer
              onSend={(text) => onSendMessage(counterpartyPubkey, text)}
            />
            {messageStatus ? <p className="muted">{messageStatus}</p> : null}
          </div>
        </article>
      </section>
    );
  }

  const lessons =
    lessonSegment === "upcoming" ? lessonBuckets.upcoming : lessonBuckets.past;

  return (
    <section className="tab-panel lessons-tab">
      <div className="stack">
        <div className="segmented">
          <button
            type="button"
            className={lessonSegment === "upcoming" ? "active" : ""}
            onClick={() => onLessonSegmentChange("upcoming")}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={lessonSegment === "past" ? "active" : ""}
            onClick={() => onLessonSegmentChange("past")}
          >
            Past
          </button>
        </div>
        <ul className="lesson-list">
          {lessons.map((agreementEvent) => {
            const { agreement } = agreementEvent;
            const counterparty =
              agreementEvent.tutorPubkey === currentPubkey
                ? agreementEvent.studentPubkey
                : agreementEvent.tutorPubkey;
            const name = tutors[counterparty]?.profile.name || toDisplayId(counterparty);

            return (
              <li
                key={agreementEvent.lessonId}
                className="lesson-card"
                onClick={() => onSelectLesson(agreementEvent)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectLesson(agreementEvent);
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
        {lessons.length === 0 ? (
          <p className="muted">No lessons in this segment.</p>
        ) : null}
      </div>
    </section>
  );
}
