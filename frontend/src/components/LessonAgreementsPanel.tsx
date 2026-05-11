import { Lesson, LessonStatus } from "../domain/lesson";
import { useI18n } from "../i18n/I18nProvider";
import { TutorProfileEvent } from "../types/nostr";
import { toDisplayId } from "../utils/display";

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
  const { t, formatDateTime } = useI18n();

  return (
    <div className="requests-panel">
      <h3>{title}</h3>
      {agreements.length === 0 ? (
        <p className="muted">{t("lessons.empty")}</p>
      ) : (
        <ul className="lesson-list">
          {agreements.map((agreement) => {
            const counterparty =
              agreement.tutorId === currentPubkey
                ? agreement.studentId
                : agreement.tutorId;
            const counterpartyName =
              profilesByPubkey[counterparty]?.profile.name ||
              toDisplayId(counterparty, t("common.states.unknown"));
            const canUpdate = agreement.tutorId === currentPubkey;
            const actions = nextStatuses(agreement.status);

            return (
              <li key={agreement.id} className="lesson-card">
                <div>
                  <strong>{agreement.subject || t("lessons.defaultTitle")}</strong>
                </div>
                <div>
                  <strong>{t("lessons.dateTime")}:</strong> {formatDateTime(agreement.scheduledAt)}
                </div>
                <div>
                  <strong>{t("lessons.duration")}:</strong>{" "}
                  {t("lessons.minutes", { count: agreement.durationMin })}
                </div>
                <div>
                  <strong>{t("lessons.counterparty")}:</strong> {counterpartyName}
                </div>
                <div className="request-actions">
                  <span className="muted">
                    {t("lessons.status")}:{" "}
                    <span className={`lesson-status status-${agreement.status}`}>
                      {t(`common.status.${agreement.status}`)}
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
                          {status === "completed"
                            ? t("lessons.markCompleted")
                            : t("lessons.cancel")}
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
