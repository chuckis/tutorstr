import { useState } from "react";
import { Star } from "lucide-react";
import { ReviewRating } from "../domain/review";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

type ReviewFormProps = {
  onSubmit: (rating: ReviewRating, comment: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function ReviewForm({ onSubmit, loading, error }: ReviewFormProps) {
  const { t } = useI18n();
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const [comment, setComment] = useState("");
  const [hovered, setHovered] = useState<ReviewRating | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    await onSubmit(rating, comment);
  }

  const canSubmit = rating !== null && !loading;

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h4>{t("review.title")}</h4>

      <div className="review-rating-row">
        <span className="muted">{t("review.rating")}:</span>
        <div className="review-stars">
          {([1, 2, 3, 4, 5] as ReviewRating[]).map((star) => {
            const filled = star <= (hovered ?? rating ?? 0);
            return (
              <button
                key={star}
                type="button"
                className={`review-star-btn ${filled ? "review-star--filled" : "review-star--empty"}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${star} ${t("review.rating")}`}
              >
                <Star size={20} fill={filled ? "var(--color-warning)" : "none"} />
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        className="ui-textarea__field review-comment-input"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder={t("review.commentPlaceholder")}
        rows={3}
        maxLength={500}
      />
      <p className="muted" style={{ fontSize: "var(--fs-xs)", textAlign: "right" }}>
        {comment.length}/500
      </p>

      <p className="review-warning muted">{t("review.warning")}</p>

      {error ? (
        <p className="error-text">{t(`review.errors.${error}` as any, { defaultValue: error })}</p>
      ) : null}

      <Button variant="primary" type="submit" disabled={!canSubmit} loading={loading}>
        {t("review.submit")}
      </Button>
    </form>
  );
}
