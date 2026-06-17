import { Review } from "../domain/review";

export interface ReviewRepository {
  subscribeReviewsForSubject(
    subjectPubkey: string,
    onReview: (review: Review) => void
  ): () => void;

  getReviewByAuthorAndLesson(
    authorPubkey: string,
    lessonId: string
  ): Promise<Review | null>;

  publishReview(
    review: Omit<Review, "id" | "createdAt">
  ): Promise<string>;
}
