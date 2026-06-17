import { describe, expect, it, vi } from "vitest";
import { PublishReview } from "./publishReview";
import { ReviewRepository } from "../../ports/reviewRepository";
import { LessonAgreementEvent } from "../../ports/lessonAgreementEventsRepository";
import { Review } from "../../domain/review";

function makeLessonAgreementEvent(
  overrides: Partial<LessonAgreementEvent> = {}
): LessonAgreementEvent {
  return {
    id: "agreement-event-1",
    created_at: 2000,
    pubkey: "tutor-1",
    lessonId: "lesson-1",
    tutorPubkey: "tutor-1",
    studentPubkey: "student-1",
    bookingEventId: "booking-event-1",
    agreement: {
      lessonId: "lesson-1",
      bookingId: "booking-1",
      subject: "Math",
      scheduledAt: "2026-06-01T10:00:00.000Z",
      durationMin: 60,
      price: 25,
      currency: "USD",
      status: "completed",
    },
    ...overrides,
  };
}

function makeReviewRepo(
  overrides: Partial<ReviewRepository> = {}
): ReviewRepository {
  return {
    subscribeReviewsForSubject: vi.fn(),
    getReviewByAuthorAndLesson: vi.fn().mockResolvedValue(null),
    publishReview: vi.fn().mockResolvedValue("new-event-id"),
    ...overrides,
  };
}

describe("PublishReview", () => {
  it("publishes a review when all invariants pass", async () => {
    const repo = makeReviewRepo();
    const useCase = new PublishReview(repo);
    const lessonEvent = makeLessonAgreementEvent();

    const result = await useCase.execute(
      lessonEvent,
      "student-1",
      "student",
      { rating: 5, comment: "Excellent!" }
    );

    expect(result).toEqual({ ok: true, eventId: "new-event-id" });
    expect(repo.publishReview).toHaveBeenCalledWith(
      expect.objectContaining({
        authorPubkey: "student-1",
        subjectPubkey: "tutor-1",
        lessonId: "lesson-1",
        lessonEventId: "agreement-event-1",
        role: "student",
        rating: 5,
        comment: "Excellent!",
      })
    );
  });

  it("rejects when lesson is not completed", async () => {
    const repo = makeReviewRepo();
    const useCase = new PublishReview(repo);
    const lessonEvent = makeLessonAgreementEvent({
      agreement: { ...makeLessonAgreementEvent().agreement, status: "scheduled" },
    });

    const result = await useCase.execute(
      lessonEvent,
      "student-1",
      "student",
      { rating: 5, comment: "Good" }
    );

    expect(result).toEqual({ ok: false, error: { type: "lesson_not_completed" } });
    expect(repo.publishReview).not.toHaveBeenCalled();
  });

  it("rejects self-review — student tries to review themselves", async () => {
    const repo = makeReviewRepo();
    const useCase = new PublishReview(repo);
    const lessonEvent = makeLessonAgreementEvent();

    const result = await useCase.execute(
      lessonEvent,
      "tutor-1",
      "student",
      { rating: 5, comment: "Reviewing myself as student" }
    );

    expect(result).toEqual({ ok: false, error: { type: "self_review" } });
    expect(repo.publishReview).not.toHaveBeenCalled();
  });

  it("rejects self-review — tutor tries to review themselves", async () => {
    const repo = makeReviewRepo();
    const useCase = new PublishReview(repo);
    const lessonEvent = makeLessonAgreementEvent();

    const result = await useCase.execute(
      lessonEvent,
      "student-1",
      "tutor",
      { rating: 5, comment: "Reviewing myself as tutor" }
    );

    expect(result).toEqual({ ok: false, error: { type: "self_review" } });
    expect(repo.publishReview).not.toHaveBeenCalled();
  });

  it("rejects duplicate review", async () => {
    const existingReview: Review = {
      id: "existing-1",
      authorPubkey: "student-1",
      subjectPubkey: "tutor-1",
      lessonId: "lesson-1",
      lessonEventId: "agreement-event-1",
      role: "student",
      rating: 4,
      comment: "Already reviewed",
      createdAt: 1500,
    };

    const repo = makeReviewRepo({
      getReviewByAuthorAndLesson: vi.fn().mockResolvedValue(existingReview),
    });
    const useCase = new PublishReview(repo);
    const lessonEvent = makeLessonAgreementEvent();

    const result = await useCase.execute(
      lessonEvent,
      "student-1",
      "student",
      { rating: 5, comment: "Trying again" }
    );

    expect(result).toEqual({ ok: false, error: { type: "already_exists" } });
    expect(repo.publishReview).not.toHaveBeenCalled();
  });
});
