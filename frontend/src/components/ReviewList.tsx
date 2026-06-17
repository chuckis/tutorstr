import { Star } from "lucide-react";
import { Review } from "../domain/review";
import { useI18n } from "../i18n/I18nProvider";
import { toDisplayId } from "../utils/display";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

type ReviewListProps = {
  reviews: Review[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  const { t, formatDateTime } = useI18n();

  if (reviews.length === 0) {
    return <p className="muted">{t("review.noReviews")}</p>;
  }

  return (
    <div className="stack">
      {reviews.map((review) => (
        <Card key={review.id} variant="outlined" padding="md">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-1)" }}>
            <div className="review-stars-display">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < review.rating ? "var(--color-warning)" : "none"}
                  color={i < review.rating ? "var(--color-warning)" : "var(--color-border)"}
                />
              ))}
            </div>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {formatDateTime(new Date(review.createdAt * 1000).toISOString())}
            </span>
          </div>
          {review.comment ? (
            <p style={{ marginBottom: "var(--space-1)" }}>{review.comment}</p>
          ) : null}
          <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {toDisplayId(review.authorPubkey)}
            </span>
            <Badge variant="info">
              {review.role === "student"
                ? t("account.roles.student")
                : t("account.roles.tutor")}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
