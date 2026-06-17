import { Review, ReviewAuthorRole, ReviewRating } from "../../domain/review";
import { ReviewRepository } from "../../ports/reviewRepository";
import { LessonAgreementEvent } from "../../ports/lessonAgreementEventsRepository";

export type PublishReviewError =
  | { type: "lesson_not_completed" }
  | { type: "self_review" }
  | { type: "already_exists" };

export type PublishReviewResult =
  | { ok: true; eventId: string }
  | { ok: false; error: PublishReviewError };

export class PublishReview {
  constructor(private reviews: ReviewRepository) {}

  async execute(
    lessonAgreementEvent: LessonAgreementEvent,
    viewerPubkey: string,
    viewerRole: ReviewAuthorRole,
    payload: { rating: ReviewRating; comment: string }
  ): Promise<PublishReviewResult> {
    if (lessonAgreementEvent.agreement.status !== "completed") {
      return { ok: false, error: { type: "lesson_not_completed" } };
    }

    const subjectPubkey =
      viewerRole === "student"
        ? lessonAgreementEvent.tutorPubkey
        : lessonAgreementEvent.studentPubkey;

    if (viewerPubkey === subjectPubkey) {
      return { ok: false, error: { type: "self_review" } };
    }

    const existing = await this.reviews.getReviewByAuthorAndLesson(
      viewerPubkey,
      lessonAgreementEvent.lessonId
    );

    if (existing) {
      return { ok: false, error: { type: "already_exists" } };
    }

    const eventId = await this.reviews.publishReview({
      authorPubkey: viewerPubkey,
      subjectPubkey,
      lessonId: lessonAgreementEvent.lessonId,
      lessonEventId: lessonAgreementEvent.id,
      role: viewerRole,
      rating: payload.rating,
      comment: payload.comment,
    });

    return { ok: true, eventId };
  }
}
