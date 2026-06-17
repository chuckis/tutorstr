import { useEffect, useState } from "react";
import { Review, ReputationSummary } from "../domain/review";
import { computeReputation } from "../application/usecases/computeReputation";
import { useRepo } from "./RepoContext";
import { useLessons } from "./useLessons";

export function useReviewsForSubject(subjectPubkey: string) {
  const { reviewRepository } = useRepo();
  const { lessons } = useLessons(subjectPubkey);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setReviews([]);
    setLoading(true);

    const unsub = reviewRepository.subscribeReviewsForSubject(subjectPubkey, (review) => {
      setReviews((prev) => {
        const exists = prev.some((r) => r.id === review.id);
        return exists ? prev : [...prev, review];
      });
    });

    setLoading(false);

    return unsub;
  }, [reviewRepository, subjectPubkey]);

  const completedLessonsCount = lessons.filter(
    (l) => l.status === "completed" && l.tutorId === subjectPubkey
  ).length;

  const reputation: ReputationSummary = computeReputation(
    subjectPubkey,
    reviews,
    completedLessonsCount
  );

  return { reviews, reputation, loading };
}
