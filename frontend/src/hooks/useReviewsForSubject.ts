import { useEffect, useMemo, useState } from "react";
import { Review, ReputationSummary } from "../domain/review";
import { computeReputation } from "../application/usecases/computeReputation";
import { useRepo } from "./RepoContext";
import { useLessonStore } from "../stores/lessonStore";
import { useReviewStore } from "../stores/reviewStore";

const EMPTY_REVIEWS: Review[] = [];

export function useReviewsForSubject(subjectPubkey: string) {
  const { reviewRepository } = useRepo();
  const [subscriptionReviews, setSubscriptionReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const storeReviews = useReviewStore((s) => {
    const r = s.bySubject[subjectPubkey];
    return r ?? EMPTY_REVIEWS;
  });

  const completedLessonsCount = useLessonStore((s) =>
    Object.values(s.byId).filter(
      (a) => a.tutorPubkey === subjectPubkey && a.agreement.status === "completed"
    ).length
  );

  useEffect(() => {
    setSubscriptionReviews([]);
    setLoading(true);

    const unsub = reviewRepository.subscribeReviewsForSubject(subjectPubkey, (review) => {
      setSubscriptionReviews((prev) => {
        const exists = prev.some((r) => r.id === review.id);
        return exists ? prev : [...prev, review];
      });
    });

    setLoading(false);

    return unsub;
  }, [reviewRepository, subjectPubkey]);

  const reviews = useMemo(() => {
    const map = new Map<string, Review>();
    for (const r of storeReviews) map.set(r.id, r);
    for (const r of subscriptionReviews) map.set(r.id, r);
    return Array.from(map.values());
  }, [storeReviews, subscriptionReviews]);

  const reputation: ReputationSummary = computeReputation(
    subjectPubkey,
    reviews,
    completedLessonsCount
  );

  return { reviews, reputation, loading };
}
