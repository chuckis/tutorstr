import { Lesson, LessonStatus } from "../domain/lesson";
import { TutorProfileEvent } from "../types/nostr";
import { formatDateTime, toDisplayId } from "../utils/display";

type LessonAgreementsPanelProps = {
  title: string;
  currentPubkey: string;
  agreements: Lesson[];
  profilesByPubkey: Record<string, TutorProfileEvent>;
  onStatusChange?: (agreement: Lesson, status: LessonStatus) => void;
};

function nextStatuses(current: LessonStatus) {
  if (current === "scheduled") {
    return ["completed", "canceled"] as const;
  }
  return [] as const;
}

export function LessonAgreementsPanel({
  title,
  currentPubkey,
  agreements,
  profilesByPubkey,
  onStatusChange
}: LessonAgreementsPanelProps) {
  return (
    <div className="requests-panel">
      <h3>{title}</h3>
      {agreements.length === 0 ? (
        <p className="muted">No lessons yet.</p>
      ) : (
        <ul className="lesson-list">
          {agreements.map((agreement) => {
            const counterparty =
              agreement.tutorId === currentPubkey
                ? agreement.studentId
                : agreement.tutorId;
            const counterpartyName =
              profilesByPubkey[counterparty]?.profile.name || toDisplayId(counterparty);
            const canUpdate = agreement.tutorId === currentPubkey;
            const actions = nextStatuses(agreement.status);

            return (
              <li key={agreement.id} className="lesson-card">
                <div>
                  <strong>{agreement.subject || "Lesson"}</strong>
                </div>
                <div>
                  <strong>Date/time:</strong> {formatDateTime(agreement.scheduledAt)}
                </div>
                <div>
                  <strong>Duration:</strong> {agreement.durationMin} min
                </div>
                <div>
                  <strong>Counterparty:</strong> {counterpartyName}
                </div>
                <div className="request-actions">
                  <span className="muted">
                    Status:{" "}
                    <span className={`lesson-status status-${agreement.status}`}>
                      {agreement.status}
                    </span>
                  </span>
                  {canUpdate && onStatusChange && actions.length > 0 ? (
                    <div className="action-buttons">
                      {actions.map((status) => (
                        <button
                          type="button"
                          key={status}
                          className={status === "canceled" ? "ghost-action" : ""}
                          onClick={() => onStatusChange(agreement, status)}
                        >
                          Mark {status}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
