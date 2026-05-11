import { Booking } from "./booking";
import { SlotOccupancy } from "./slotOccupancy";
import { isActiveBookingStatus, makeSlotBidKey } from "./slotAllocation";

export type TimestampedRecord = {
  created_at: number;
};

export type BookingTimestampLookup = Record<string, TimestampedRecord | undefined>;

function getBookingTimestamp(
  bookingId: string,
  statuses: BookingTimestampLookup,
  requests: BookingTimestampLookup
) {
  return statuses[bookingId]?.created_at || requests[bookingId]?.created_at || 0;
}

export function buildRequestsByAllocationKey(
  bookings: Booking[],
  statuses: BookingTimestampLookup,
  requests: BookingTimestampLookup
) {
  return bookings.reduce<Record<string, Booking[]>>((acc, booking) => {
    const existing = acc[booking.slotAllocationKey] || [];
    existing.push(booking);
    existing.sort(
      (left, right) =>
        getBookingTimestamp(right.id, statuses, requests) -
        getBookingTimestamp(left.id, statuses, requests)
    );
    acc[booking.slotAllocationKey] = existing;
    return acc;
  }, {});
}

export function selectWinningOccupancyByAllocationKey(
  bookings: Booking[],
  statuses: BookingTimestampLookup,
  requests: BookingTimestampLookup
) {
  const winnerTimestampByAllocationKey: Record<string, number> = {};

  return bookings.reduce<Record<string, SlotOccupancy>>((acc, booking) => {
    if (booking.status !== "accepted") {
      return acc;
    }

    const bookingTs = getBookingTimestamp(booking.id, statuses, requests);
    const currentWinnerTs =
      winnerTimestampByAllocationKey[booking.slotAllocationKey] ?? -1;

    if (bookingTs >= currentWinnerTs) {
      acc[booking.slotAllocationKey] = {
        studentId: booking.studentId,
        source: "booking"
      };
      winnerTimestampByAllocationKey[booking.slotAllocationKey] = bookingTs;
    }

    return acc;
  }, {});
}

export function selectActiveBidBySlotAndStudent(
  bookings: Booking[],
  statuses: BookingTimestampLookup,
  requests: BookingTimestampLookup
) {
  return bookings.reduce<Record<string, Booking>>((acc, booking) => {
    if (!isActiveBookingStatus(booking.status)) {
      return acc;
    }

    const slotBidKey = makeSlotBidKey(booking.tutorId, booking.studentId, {
      start: booking.scheduledAt,
      end: booking.scheduledEnd || ""
    });
    const existing = acc[slotBidKey];
    const bookingTs = getBookingTimestamp(booking.id, statuses, requests);
    const existingTs = existing
      ? getBookingTimestamp(existing.id, statuses, requests)
      : -1;

    if (!existing || bookingTs >= existingTs) {
      acc[slotBidKey] = booking;
    }

    return acc;
  }, {});
}
