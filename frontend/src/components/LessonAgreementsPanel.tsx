import { nip19 } from "nostr-tools";
import {
  LessonAgreementEvent,
  LessonAgreementStatus,
  TutorProfileEvent
} from "../types/nostr";

type LessonAgreementsPanelProps = {
  title: string;
  currentPubkey: string;
  agreements: LessonAgreementEvent[];
  profilesByPubkey: Record<string, TutorProfileEvent>;
  onStatusChange?: (
    agreement: LessonAgreementEvent,
    status: LessonAgreementStatus
  ) => void;
};

function toDisplayId(pubkey: string) {
  if (!pubkey) {
    return "Unknown";
  }
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 20)}...`;
  } catch {
    return `${pubkey.slice(0, 12)}...`;
  }
}

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp);
}

function nextStatuses(current: LessonAgreementStatus) {
  if (current === "scheduled") {
    return ["completed", "cancelled"] as const;
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
          {agreements.map((agreementEvent) => {
            const { agreement } = agreementEvent;
            const counterparty =
              agreementEvent.tutorPubkey === currentPubkey
                ? agreementEvent.studentPubkey
                : agreementEvent.tutorPubkey;
            const counterpartyName =
              profilesByPubkey[counterparty]?.profile.name || toDisplayId(counterparty);
            const canUpdate = agreementEvent.tutorPubkey === currentPubkey;
            const actions = nextStatuses(agreement.status);

            return (
              <li key={agreementEvent.lessonId} className="lesson-card">
                <div>
                  <strong>{agreement.subject || "Lesson"}</strong>
                </div>
                <div>
                  <strong>Date/time:</strong> {formatDate(agreement.scheduledAt)}
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
                          className={status === "cancelled" ? "ghost" : ""}
                          onClick={() => onStatusChange(agreementEvent, status)}
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
