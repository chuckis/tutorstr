import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { Booking } from "../../domain/booking";
import { BookingRepository } from "../../ports/bookingRepository";

export class IllegalCancelTransitionError extends Error {
  constructor(
    public readonly viewerRole: AccountRole,
    public readonly currentStatus: Booking["status"]
  ) {
    super(
      `Role "${viewerRole}" cannot cancel a booking in status "${currentStatus}"`
    );
    this.name = "IllegalCancelTransitionError";
  }
}

export class CancelBooking {
  constructor(private bookings: BookingRepository) {}

  async execute(booking: Booking, viewerRole: AccountRole): Promise<void> {
    if (viewerRole === "tutor") {
      assertRole(viewerRole, "tutor");
      if (booking.status !== "accepted") {
        throw new IllegalCancelTransitionError(viewerRole, booking.status);
      }
      await this.bookings.updateStatus(booking.id, "cancelled", {
        reason: "tutor_rejected"
      });
      return;
    }

    assertRole(viewerRole, "student");
    if (booking.status !== "pending") {
      throw new IllegalCancelTransitionError(viewerRole, booking.status);
    }
    await this.bookings.updateStatus(booking.id, "cancelled", {
      reason: "student_cancelled"
    });
  }
}
