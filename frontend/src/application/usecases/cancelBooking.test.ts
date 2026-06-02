import { describe, expect, it, vi } from "vitest";
import { Booking } from "../../domain/booking";
import { BookingRepository } from "../../ports/bookingRepository";
import { CancelBooking, IllegalCancelTransitionError } from "./cancelBooking";

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

describe("CancelBooking", () => {
  describe("as tutor", () => {
    it("cancels an accepted booking with the tutor_rejected reason", async () => {
      const booking = makeBooking({ status: "accepted" });
      const bookingRepo = makeBookingRepo();

      await new CancelBooking(bookingRepo).execute(booking, "tutor");

      expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
        booking.id,
        "cancelled",
        { reason: "tutor_rejected" }
      );
    });

    it("refuses to cancel a pending booking as tutor", async () => {
      const booking = makeBooking({ status: "pending" });
      const bookingRepo = makeBookingRepo();

      await expect(
        new CancelBooking(bookingRepo).execute(booking, "tutor")
      ).rejects.toBeInstanceOf(IllegalCancelTransitionError);

      expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses to cancel a rejected booking as tutor", async () => {
      const booking = makeBooking({ status: "rejected" });
      const bookingRepo = makeBookingRepo();

      await expect(
        new CancelBooking(bookingRepo).execute(booking, "tutor")
      ).rejects.toBeInstanceOf(IllegalCancelTransitionError);

      expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses to double-cancel an already cancelled booking as tutor", async () => {
      const booking = makeBooking({ status: "cancelled" });
      const bookingRepo = makeBookingRepo();

      await expect(
        new CancelBooking(bookingRepo).execute(booking, "tutor")
      ).rejects.toBeInstanceOf(IllegalCancelTransitionError);

      expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("as student", () => {
    it("cancels a pending booking with the student_cancelled reason", async () => {
      const booking = makeBooking({ status: "pending" });
      const bookingRepo = makeBookingRepo();

      await new CancelBooking(bookingRepo).execute(booking, "student");

      expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
        booking.id,
        "cancelled",
        { reason: "student_cancelled" }
      );
    });

    it("refuses to cancel an accepted booking as student", async () => {
      const booking = makeBooking({ status: "accepted" });
      const bookingRepo = makeBookingRepo();

      await expect(
        new CancelBooking(bookingRepo).execute(booking, "student")
      ).rejects.toBeInstanceOf(IllegalCancelTransitionError);

      expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses to cancel a rejected booking as student", async () => {
      const booking = makeBooking({ status: "rejected" });
      const bookingRepo = makeBookingRepo();

      await expect(
        new CancelBooking(bookingRepo).execute(booking, "student")
      ).rejects.toBeInstanceOf(IllegalCancelTransitionError);

      expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  it("exposes viewer role and current status on the illegal transition error", async () => {
    const booking = makeBooking({ status: "pending" });

    try {
      await new CancelBooking(makeBookingRepo()).execute(booking, "tutor");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalCancelTransitionError);
      const typed = error as IllegalCancelTransitionError;
      expect(typed.viewerRole).toBe("tutor");
      expect(typed.currentStatus).toBe("pending");
    }
  });
});
