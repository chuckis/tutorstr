import { Booking, BookingStatus } from "../../domain/booking";
import { BookingRequestEvent, BookingStatusEvent } from "../../types/nostr";

function toBookingStatus(status?: string): BookingStatus {
  if (status === "accepted" || status === "rejected" || status === "cancelled") {
    return status;
  }
  return "pending";
}

function toRawStatus(status: BookingStatus) {
  return status;
}

export function bookingFromNostr(
  request: BookingRequestEvent,
  statusEvent?: BookingStatusEvent
): Booking {
  return {
    id: request.request.bookingId,
    tutorId: request.tutorPubkey,
    studentId: request.pubkey,
    scheduledAt: request.request.requestedSlot.start,
    scheduledEnd: request.request.requestedSlot.end,
    status: toBookingStatus(statusEvent?.status.status),
    requestEventId: request.eventId
  };
}

export function bookingStatusToNostr(status: BookingStatus) {
  return toRawStatus(status);
}
