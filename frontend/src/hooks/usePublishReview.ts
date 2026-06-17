import { useState, useCallback } from "react";
import { ReviewRating } from "../domain/review";
import { ReviewRepository } from "../ports/reviewRepository";
import { PublishReview, PublishReviewResult } from "../application/usecases/publishReview";
import { LessonAgreementEvent } from "../ports/lessonAgreementEventsRepository";
import { useRepo } from "./RepoContext";

export function usePublishReview(viewerRole: "student" | "tutor") {
  const { reviewRepository } = useRepo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    async (
      lessonAgreementEvent: LessonAgreementEvent,
      viewerPubkey: string,
      rating: ReviewRating,
      comment: string
    ): Promise<PublishReviewResult> => {
      setLoading(true);
      setError(null);

      const useCase = new PublishReview(reviewRepository);
      const result = await useCase.execute(
        lessonAgreementEvent,
        viewerPubkey,
        viewerRole,
        { rating, comment }
      );

      if (!result.ok) {
        setError(result.error.type);
      }

      setLoading(false);
      return result;
    },
    [reviewRepository, viewerRole]
  );

  return { publish, loading, error };
}
