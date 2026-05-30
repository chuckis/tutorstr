import { describe, expect, it, vi } from "vitest";
import { Booking } from "../../domain/booking";
import { Lesson } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";
import { AcceptBooking } from "./acceptBooking";

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

    const bookingRepo: BookingRepository = {
      getIncoming: vi.fn(),
      getOutgoing: vi.fn(),
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi
        .fn()
        .mockResolvedValue([targetBooking, competingPending, inactiveRejected]),
      updateStatus: vi.fn().mockResolvedValue(undefined)
    };

    const lessonRepo: LessonRepository = {
      getForUser: vi.fn(),
      getById: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn()
    };

    const createLesson = vi.fn().mockReturnValue(
      makeLesson({
        id: "lesson-from-factory",
        bookingId: targetBooking.id
      })
    );

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id
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

    const bookingRepo: BookingRepository = {
      getIncoming: vi.fn(),
      getOutgoing: vi.fn(),
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi.fn().mockResolvedValue([targetBooking, existingWinner]),
      updateStatus: vi.fn().mockResolvedValue(undefined)
    };

    const lessonRepo: LessonRepository = {
      getForUser: vi.fn(),
      getById: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn()
    };

    const createLesson = vi.fn();

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id
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

    const bookingRepo: BookingRepository = {
      getIncoming: vi.fn(),
      getOutgoing: vi.fn(),
      getById: vi.fn().mockResolvedValue(targetBooking),
      getByAllocationKey: vi.fn().mockResolvedValue([targetBooking, previousWinner]),
      updateStatus: vi.fn().mockResolvedValue(undefined)
    };

    const lessonRepo: LessonRepository = {
      getForUser: vi.fn(),
      getById: vi.fn().mockResolvedValue(
        makeLesson({
          id: previousWinner.id,
          bookingId: previousWinner.id,
          studentId: previousWinner.studentId,
          status: "canceled"
        })
      ),
      save: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn()
    };

    const createLesson = vi.fn().mockReturnValue(
      makeLesson({
        id: targetBooking.id,
        bookingId: targetBooking.id,
        studentId: targetBooking.studentId
      })
    );

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute(
      targetBooking.id
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
    const bookingRepo: BookingRepository = {
      getIncoming: vi.fn(),
      getOutgoing: vi.fn(),
      getById: vi.fn().mockResolvedValue(null),
      getByAllocationKey: vi.fn(),
      updateStatus: vi.fn()
    };

    const lessonRepo: LessonRepository = {
      getForUser: vi.fn(),
      getById: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn()
    };

    const createLesson = vi.fn();

    await new AcceptBooking(bookingRepo, lessonRepo, createLesson).execute("missing-booking");

    expect(bookingRepo.getByAllocationKey).not.toHaveBeenCalled();
    expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    expect(lessonRepo.save).not.toHaveBeenCalled();
    expect(createLesson).not.toHaveBeenCalled();
  });
});
