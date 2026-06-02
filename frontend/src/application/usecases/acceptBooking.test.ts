import { describe, expect, it, vi } from "vitest";
import { Booking } from "../../domain/booking";
import { Lesson } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";
import { AcceptBooking } from "./acceptBooking";
import { RoleMismatchError } from "../account/assertRole";

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    tutorId: "tutor-1",
    studentId: "student-1",
    scheduledAt: "2026-05-09T10:00:00.000Z",
    scheduledEnd: "2026-05-09T11:00:00.000Z",
    status: "pending",
    slotAllocationKey: "slot-1",
    ...overrides
  };
}

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

function makeLessonRepo(overrides: Partial<LessonRepository> = {}): LessonRepository {
  return {
    getForUser: vi.fn(),
    getById: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn(),
    ...overrides
  };
}

describe("AcceptBooking", () => {
  it("accepts the booking, saves a lesson, and rejects competing active entries", async () => {
    const targetBooking = makeBooking();
    const competingPending = makeBooking({
      id: "booking-2",
      studentId: "student-2",
      status: "pending"
    });
    const competingAccepted = makeBooking({
      id: "booking-3",
      studentId: "student-3",
      status: "accepted"
    });
    const inactiveRejected = makeBooking({
      id: "booking-4",
      studentId: "student-4",
      status: "rejected"
    });

    const bookingRepo = makeBookingRepo({
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi
        .fn()
        .mockResolvedValue([targetBooking, competingPending, inactiveRejected])
    });

    const lessonRepo = makeLessonRepo();

    const createLesson = vi.fn().mockReturnValue(
      makeLesson({
        id: "lesson-from-factory",
        bookingId: targetBooking.id
      })
    );

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id,
      "tutor"
    );

    expect(bookingRepo.getById).toHaveBeenCalledWith(targetBooking.id);
    expect(bookingRepo.updateStatus).toHaveBeenNthCalledWith(
      1,
      targetBooking.id,
      "accepted"
    );
    expect(createLesson).toHaveBeenCalledWith({
      bookingId: targetBooking.id,
      tutorId: targetBooking.tutorId,
      studentId: targetBooking.studentId,
      scheduledAt: targetBooking.scheduledAt
    });
    expect(lessonRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "lesson-from-factory",
        bookingId: targetBooking.id
      })
    );
    expect(bookingRepo.updateStatus).toHaveBeenNthCalledWith(
      2,
      competingPending.id,
      "rejected",
      { reason: "slot_filled" }
    );
    expect(bookingRepo.updateStatus).toHaveBeenCalledTimes(2);
    expect(competingAccepted.status).toBe("accepted");
    expect(inactiveRejected.status).toBe("rejected");
  });

  it("does nothing when another accepted winner already exists", async () => {
    const targetBooking = makeBooking();
    const existingWinner = makeBooking({
      id: "booking-2",
      studentId: "student-2",
      status: "accepted"
    });

    const bookingRepo = makeBookingRepo({
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi.fn().mockResolvedValue([targetBooking, existingWinner])
    });
    const lessonRepo = makeLessonRepo();
    const createLesson = vi.fn();

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id,
      "tutor"
    );

    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    expect(lessonRepo.save).not.toHaveBeenCalled();
    expect(createLesson).not.toHaveBeenCalled();
  });

  it("accepts a new booking when the previous winner's lesson was canceled", async () => {
    const targetBooking = makeBooking({
      id: "booking-2",
      studentId: "student-2"
    });
    const previousWinner = makeBooking({
      id: "booking-1",
      studentId: "student-1",
      status: "accepted"
    });

    const bookingRepo = makeBookingRepo({
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi.fn().mockResolvedValue([targetBooking, previousWinner])
    });

    const lessonRepo = makeLessonRepo({
      getById: vi.fn().mockResolvedValue(
        makeLesson({
          id: previousWinner.id,
          bookingId: previousWinner.id,
          studentId: previousWinner.studentId,
          status: "canceled"
        })
      )
    });

    const createLesson = vi.fn().mockReturnValue(
      makeLesson({
        id: targetBooking.id,
        bookingId: targetBooking.id,
        studentId: targetBooking.studentId
      })
    );

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id,
      "tutor"
    );

    expect(lessonRepo.getById).toHaveBeenCalledWith(previousWinner.id);
    expect(bookingRepo.updateStatus).toHaveBeenNthCalledWith(
      1,
      targetBooking.id,
      "accepted"
    );
    expect(lessonRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: targetBooking.id,
        bookingId: targetBooking.id,
        studentId: targetBooking.studentId
      })
    );
    expect(bookingRepo.updateStatus).toHaveBeenCalledTimes(1);
  });

  it("returns early when the booking does not exist", async () => {
    const bookingRepo = makeBookingRepo({
      getById: vi.fn().mockResolvedValue(null)
    });
    const lessonRepo = makeLessonRepo();
    const createLesson = vi.fn();

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      "missing-booking",
      "tutor"
    );

    expect(bookingRepo.getByAllocationKey).not.toHaveBeenCalled();
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    expect(lessonRepo.save).not.toHaveBeenCalled();
    expect(createLesson).not.toHaveBeenCalled();
  });

  it("refuses to run when the viewer is a student", async () => {
    const bookingRepo = makeBookingRepo();
    const lessonRepo = makeLessonRepo();
    const createLesson = vi.fn();

    await expect(
      new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
        "booking-1",
        "student"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(bookingRepo.getById).not.toHaveBeenCalled();
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    expect(lessonRepo.save).not.toHaveBeenCalled();
    expect(createLesson).not.toHaveBeenCalled();
  });
});
