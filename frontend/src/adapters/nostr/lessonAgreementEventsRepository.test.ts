import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonAgreement } from "../../types/nostr";

describe("toLessonAgreementEvent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps tutor and student roles when the student authors a cancellation", async () => {
    const { toLessonAgreementEvent } = await import(
      "./lessonAgreementEventsRepository"
    );
    const agreement: LessonAgreement = {
      lessonId: "lesson-1",
      bookingId: "booking-1",
      subject: "Math",
      scheduledAt: "2026-05-09T10:00:00.000Z",
      durationMin: 60,
      price: 25,
      currency: "USD",
      status: "cancelled"
    };

    const result = toLessonAgreementEvent(
      "student-1",
      "event-1",
      10,
      [
        ["d", "lesson-1"],
        ["p", "tutor-1"],
        ["p", "student-1"],
        ["t", "lesson:agreement"]
      ],
      agreement
    );

    expect(result.tutorPubkey).toBe("tutor-1");
    expect(result.studentPubkey).toBe("student-1");
    expect(result.agreement.status).toBe("cancelled");
  });
});
