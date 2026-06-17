import { ReputationSummary, Review } from "../../domain/review";

export function computeReputation(
  subjectPubkey: string,
  reviews: Review[],
  completedLessonsCount: number
): ReputationSummary {
  if (reviews.length === 0) {
    return { subjectPubkey, averageRating: 0, reviewCount: 0, completedLessonsCount };
  }
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return {
    subjectPubkey,
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: reviews.length,
    completedLessonsCount,
  };
}
