import { Booking, BookingStatus } from "../../domain/booking";
import { makeSlotAllocationKey } from "../../domain/slotAllocation";
import { BookingRequestEvent, BookingStatusEvent } from "../../types/nostr";

type NostrBookingStatus = BookingStatusEvent["status"]["status"];

function toBookingStatus(status?: string): BookingStatus {
  if (status === "accepted" || status === "rejected" || status === "cancelled") {
    return status;
  }
  return "pending";
}

export function bookingFromNostr(
  request: BookingRequestEvent,
  statusEvent?: BookingStatusEvent
): Booking {
  const slotAllocationKey =
    request.request.slotAllocationKey ||
    makeSlotAllocationKey(request.tutorPubkey, request.request.requestedSlot);

  return {
    id: request.request.bookingId,
    tutorId: request.tutorPubkey,
    studentId: request.pubkey,
    scheduledAt: request.request.requestedSlot.start,
    scheduledEnd: request.request.requestedSlot.end,
    status: toBookingStatus(statusEvent?.status.status),
    requestEventId: request.eventId,
    slotAllocationKey,
    resolutionReason: statusEvent?.status.reason
  };
}

export function bookingStatusToNostr(
  status: Exclude<BookingStatus, "pending">
): NostrBookingStatus {
  return status;
}
