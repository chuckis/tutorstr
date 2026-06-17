import { Review } from "../domain/review";
import { useI18n } from "../i18n/I18nProvider";
import { toDisplayId } from "../utils/display";

type ReviewListProps = {
  reviews: Review[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  const { t, formatDateTime } = useI18n();

  if (reviews.length === 0) {
    return <p className="muted">{t("review.noReviews")}</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-item">
          <div className="review-item-header">
            <span className="star-display">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < review.rating ? "star-filled" : "star-empty"}>
                  {i < review.rating ? "\u2605" : "\u2606"}
                </span>
              ))}
            </span>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {formatDateTime(new Date(review.createdAt * 1000).toISOString())}
            </span>
          </div>
          {review.comment ? <p className="review-comment-text">{review.comment}</p> : null}
          <div className="review-item-meta">
            <span className="muted">{toDisplayId(review.authorPubkey)}</span>
            <span className="muted">
              {review.role === "student" ? "Student" : "Tutor"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
