import { describe, expect, it, vi } from "vitest";
import { Lesson, LessonStatus } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";
import {
  ChangeLessonStatus,
  InvalidLessonStatusTransitionError
} from "./changeLessonStatus";
import { RoleMismatchError } from "../account/assertRole";

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

function makeLessonRepo(overrides: Partial<LessonRepository> = {}): LessonRepository {
  return {
    getForUser: vi.fn(),
    getById: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function makeBookingRepo(overrides: Partial<BookingRepository> = {}): BookingRepository {
  return {
    getIncoming: vi.fn(),
    getOutgoing: vi.fn(),
    getById: vi.fn(),
    getByAllocationKey: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("ChangeLessonStatus", () => {
  it("lets a tutor complete a scheduled lesson", async () => {
    const lesson = makeLesson();
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
      lesson,
      "completed",
      "tutor",
      "tutor-1"
    );

    expect(lessonRepo.updateStatus).toHaveBeenCalledWith(lesson.id, "completed");
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("lets a tutor cancel a scheduled lesson without touching the booking", async () => {
    const lesson = makeLesson();
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
      lesson,
      "canceled",
      "tutor",
      "tutor-1"
    );

    expect(lessonRepo.updateStatus).toHaveBeenCalledWith(lesson.id, "canceled");
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("refuses to complete a lesson when the viewer is a student", async () => {
    const lesson = makeLesson();
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await expect(
      new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
        lesson,
        "completed",
        "student",
        "student-1"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(lessonRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("refuses to cancel a lesson when the viewer is a student", async () => {
    const lesson = makeLesson();
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await expect(
      new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
        lesson,
        "canceled",
        "student",
        "student-1"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(lessonRepo.updateStatus).not.toHaveBeenCalled();
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects an invalid transition", async () => {
    const lesson = makeLesson({ status: "completed" });
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await expect(
      new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
        lesson,
        "scheduled",
        "tutor",
        "tutor-1"
      )
    ).rejects.toBeInstanceOf(InvalidLessonStatusTransitionError);

    expect(lessonRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects a same-status transition", async () => {
    const lesson = makeLesson({ status: "scheduled" });
    const lessonRepo = makeLessonRepo();
    const bookingRepo = makeBookingRepo();

    await expect(
      new ChangeLessonStatus(lessonRepo, bookingRepo).execute(
        lesson,
        "scheduled",
        "tutor",
        "tutor-1"
      )
    ).rejects.toBeInstanceOf(InvalidLessonStatusTransitionError);

    expect(lessonRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("exposes the from/to status on the transition error", async () => {
    const lesson = makeLesson({ status: "completed" });

    try {
      await new ChangeLessonStatus(makeLessonRepo(), makeBookingRepo()).execute(
        lesson,
        "canceled" as LessonStatus,
        "tutor",
        "tutor-1"
      );
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidLessonStatusTransitionError);
      const transition = error as InvalidLessonStatusTransitionError;
      expect(transition.from).toBe("completed");
      expect(transition.to).toBe("canceled");
    }
  });
});
