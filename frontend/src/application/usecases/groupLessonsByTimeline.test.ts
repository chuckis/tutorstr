import { describe, expect, it } from "vitest";
import { Lesson } from "../../domain/lesson";
import { groupLessonsByTimeline } from "./groupLessonsByTimeline";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    bookingId: "booking-1",
    tutorId: "tutor-1",
    studentId: "student-1",
    scheduledAt: "2026-05-09T10:00:00.000Z",
    durationMin: 60,
    subject: "Math",
    status: "scheduled",
    ...overrides
  };
}

describe("groupLessonsByTimeline", () => {
  it("keeps future scheduled lessons in upcoming", () => {
    const futureLesson = makeLesson({
      id: "future-lesson",
      scheduledAt: "2026-05-10T10:00:00.000Z"
    });

    const result = groupLessonsByTimeline(
      [futureLesson],
      Date.parse("2026-05-09T12:00:00.000Z")
    );

    expect(result.upcoming).toEqual([futureLesson]);
    expect(result.past).toEqual([]);
  });

  it("moves past or non-scheduled lessons into past", () => {
    const pastScheduled = makeLesson({
      id: "past-scheduled",
      scheduledAt: "2026-05-08T10:00:00.000Z"
    });
    const completedFuture = makeLesson({
      id: "completed-future",
      scheduledAt: "2026-05-10T10:00:00.000Z",
      status: "completed"
    });

    const result = groupLessonsByTimeline(
      [pastScheduled, completedFuture],
      Date.parse("2026-05-09T12:00:00.000Z")
    );

    expect(result.upcoming).toEqual([]);
    expect(result.past).toEqual([pastScheduled, completedFuture]);
  });

  it("treats invalid dates as upcoming when the lesson is still scheduled", () => {
    const invalidDateLesson = makeLesson({
      id: "invalid-date",
      scheduledAt: "not-a-date"
    });

    const result = groupLessonsByTimeline([invalidDateLesson], 0);

    expect(result.upcoming).toEqual([invalidDateLesson]);
    expect(result.past).toEqual([]);
  });
});
