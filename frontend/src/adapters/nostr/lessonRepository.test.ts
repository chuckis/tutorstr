import { describe, expect, it, vi } from "vitest";
import { LessonAgreementEvent } from "../../ports/lessonAgreementEventsRepository";
import { createNostrLessonRepository } from "./lessonRepository";

function makeAgreement(
  overrides: Partial<LessonAgreementEvent> = {}
): LessonAgreementEvent {
  return {
    id: "event-1",
    created_at: 1,
    pubkey: "tutor-1",
    lessonId: "lesson-1",
    tutorPubkey: "tutor-1",
    studentPubkey: "student-1",
    bookingEventId: "booking-event-1",
    agreement: {
      lessonId: "lesson-1",
      bookingId: "booking-1",
      subject: "Math",
      scheduledAt: "2026-05-09T10:00:00.000Z",
      durationMin: 60,
      price: 25,
      currency: "USD",
      status: "scheduled"
    },
    ...overrides
  };
}

describe("createNostrLessonRepository", () => {
  it("keeps both lesson participants when a student cancels a lesson", async () => {
    const agreement = makeAgreement();
    const updateLessonAgreementStatus = vi.fn().mockResolvedValue(undefined);

    const repository = createNostrLessonRepository({
      userId: "student-1",
      list: [agreement],
      agreements: {
        [agreement.lessonId]: agreement
      },
      publishLessonAgreement: vi.fn(),
      updateLessonAgreementStatus
    });

    await repository.updateStatus(agreement.lessonId, "canceled");

    expect(updateLessonAgreementStatus).toHaveBeenCalledWith(
      "tutor-1",
      "student-1",
      expect.objectContaining({
        bookingEventId: "booking-event-1",
        status: "cancelled"
      })
    );
  });
});
