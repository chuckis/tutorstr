import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { Booking, BookingStatus } from "../../domain/booking";
import { BookingRepository } from "../../ports/bookingRepository";

export type BookingStatusSnapshot = { status: Booking["status"] };

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
  constructor(
    private bookings: BookingRepository,
    private onOptimisticUpdate?: (bookingId: string, status: Booking["status"]) => void,
    private onRollback?: (bookingId: string, snapshot: BookingStatusSnapshot | undefined) => void,
  ) {}

  async execute(booking: Booking, viewerRole: AccountRole): Promise<void> {
    const snapshot: BookingStatusSnapshot = { status: booking.status };

    if (viewerRole === "tutor") {
      assertRole(viewerRole, "tutor");
      if (booking.status !== "accepted") {
        throw new IllegalCancelTransitionError(viewerRole, booking.status);
      }
      this.onOptimisticUpdate?.(booking.id, "cancelled");
      try {
        await this.bookings.updateStatus(booking.id, "cancelled", {
          reason: "tutor_rejected"
        });
      } catch (error) {
        this.onRollback?.(booking.id, snapshot);
        throw error;
      }
      return;
    }

    assertRole(viewerRole, "student");
    if (booking.status !== "pending") {
      throw new IllegalCancelTransitionError(viewerRole, booking.status);
    }
    this.onOptimisticUpdate?.(booking.id, "cancelled");
    try {
      await this.bookings.updateStatus(booking.id, "cancelled", {
        reason: "student_cancelled"
      });
    } catch (error) {
      this.onRollback?.(booking.id, snapshot);
      throw error;
    }
  }
}
