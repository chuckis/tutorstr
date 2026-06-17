import { Star } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { ReputationSummary } from "../domain/review";

type ReputationBadgeProps = {
  reputation: ReputationSummary;
};

export function ReputationBadge({ reputation }: ReputationBadgeProps) {
  const { t } = useI18n();

  if (reputation.reviewCount === 0 && reputation.completedLessonsCount === 0) {
    return null;
  }

  const parts: string[] = [];

  if (reputation.reviewCount > 0) {
    parts.push(`${reputation.averageRating}`);
    parts.push(`(${reputation.reviewCount})`);
  }

  if (reputation.completedLessonsCount > 0) {
    parts.push(t("review.lessonsCount", { count: reputation.completedLessonsCount }));
  }

  return (
    <p className="muted" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
      {reputation.reviewCount > 0 ? (
        <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />
      ) : null}
      <span>{parts.join(" \u00b7 ")}</span>
    </p>
  );
}
