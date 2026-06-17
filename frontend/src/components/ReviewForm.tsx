import { useState } from "react";
import { ReviewRating } from "../domain/review";
import { useI18n } from "../i18n/I18nProvider";

type ReviewFormProps = {
  onSubmit: (rating: ReviewRating, comment: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

const RATING_LABELS: Record<ReviewRating, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
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

      <div className="star-rating">
        <span className="muted">{t("review.rating")}:</span>
        <div className="star-rating-stars">
          {([1, 2, 3, 4, 5] as ReviewRating[]).map((star) => {
            const filled = star <= (hovered ?? rating ?? 0);
            return (
              <button
                key={star}
                type="button"
                className={`star-btn ${filled ? "star-filled" : "star-empty"}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${star} ${t("review.rating")}`}
              >
                {filled ? "\u2605" : "\u2606"}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        className="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder={t("review.commentPlaceholder")}
        rows={3}
        maxLength={500}
      />
      <p className="muted" style={{ fontSize: "var(--fs-xs)" }}>
        {comment.length}/500
      </p>

      <p className="review-warning muted">{t("review.warning")}</p>

      {error ? (
        <p className="error-text">
          {t(`review.errors.${error}` as any, { defaultValue: error })}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!canSubmit}
      >
        {loading ? t("common.states.saving") : t("review.submit")}
      </button>
    </form>
  );
}
