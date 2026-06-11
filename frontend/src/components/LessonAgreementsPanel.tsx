import { Lesson, LessonStatus } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { UserProfileEvent } from "../hooks/hookTypes";
import { toDisplayId } from "../utils/display";
import { Button } from "./ui/Button";
import { LessonCard } from "./ui/LessonCard";
import { EmptyState } from "./ui/EmptyState";

type LessonAgreementsPanelProps = {
  title: string;
  currentPubkey: string;
  agreements: Lesson[];
  profilesByPubkey: Record<string, UserProfileEvent>;
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
        <EmptyState description={t("lessons.empty")} />
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
              <LessonCard key={agreement.id} onClick={() => {}}>
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
                        <Button
                          key={status}
                          variant={status === "canceled" ? "ghost" : "primary"}
                          onClick={() => onStatusChange(agreement, status)}>
                          {status === "completed"
                            ? t("lessons.markCompleted")
                            : t("lessons.cancel")}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </LessonCard>
            );
          })}
        </ul>
      )}
    </div>
  );
}
