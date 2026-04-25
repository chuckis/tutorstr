import { useMemo } from "react";
import { bookingFromNostr, bookingStatusToNostr } from "../adapters/nostr/bookingAdapter";
import { AcceptBooking } from "../application/usecases/acceptBooking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import {
  isActiveBookingStatus,
  makeSlotAllocationKey,
  makeSlotBidKey
} from "../domain/slotAllocation";
import { Booking } from "../domain/booking";
import { BookingRepository } from "../ports/bookingRepository";
import { useBookingActions } from "./useBookingActions";
import { useBookingRequestsForTutor } from "./useBookingRequestsForTutor";
import { useBookingStatusesForUser } from "./useBookingStatusesForUser";
import { useMyBookingRequests } from "./useMyBookingRequests";
import { useLessonRepository } from "./useLessonRepository";

export function useBookings(userId: string, lessonDefaults?: {
  durationMin?: number;
  subject?: string;
  price?: number;
  currency?: string;
}) {
  const { requests: incomingRequests } = useBookingRequestsForTutor(userId);
  const { requests: outgoingRequests } = useMyBookingRequests(userId);
  const { statuses } = useBookingStatusesForUser(userId);
  const { publishBookingStatus } = useBookingActions();
  const lessonRepository = useLessonRepository(userId, lessonDefaults);

  const incoming = useMemo(
    () => incomingRequests.map((request) => bookingFromNostr(request, statuses[request.request.bookingId])),
    [incomingRequests, statuses]
  );
  const outgoing = useMemo(
    () => outgoingRequests.map((request) => bookingFromNostr(request, statuses[request.request.bookingId])),
    [outgoingRequests, statuses]
  );

  const requestMap = useMemo(() => {
    return [...incomingRequests, ...outgoingRequests].reduce<Record<string, (typeof incomingRequests)[number]>>(
      (acc, request) => {
        acc[request.request.bookingId] = request;
        return acc;
      },
      {}
    );
  }, [incomingRequests, outgoingRequests]);

  const latestIncomingRequestTs = useMemo(
    () => incomingRequests.reduce((max, item) => Math.max(max, item.created_at), 0),
    [incomingRequests]
  );

  const allBookings = useMemo(() => {
    const deduped = new Map<string, Booking>();

    [...incoming, ...outgoing].forEach((booking) => {
      deduped.set(booking.id, booking);
    });

    return Array.from(deduped.values());
  }, [incoming, outgoing]);

  const requestsByAllocationKey = useMemo(() => {
    return allBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
      const existing = acc[booking.slotAllocationKey] || [];
      existing.push(booking);
      existing.sort((left, right) => {
        const leftTs =
          statuses[left.id]?.created_at || requestMap[left.id]?.created_at || 0;
        const rightTs =
          statuses[right.id]?.created_at || requestMap[right.id]?.created_at || 0;

        return rightTs - leftTs;
      });
      acc[booking.slotAllocationKey] = existing;
      return acc;
    }, {});
  }, [allBookings, requestMap, statuses]);

  const winnerByAllocationKey = useMemo(() => {
    return allBookings.reduce<Record<string, SlotOccupancy>>((acc, booking) => {
      if (booking.status !== "accepted") {
        return acc;
      }

      const currentWinner = acc[booking.slotAllocationKey];
      const bookingTs =
        statuses[booking.id]?.created_at || requestMap[booking.id]?.created_at || 0;
      const currentWinnerTs = currentWinner
        ? Math.max(
            ...allBookings
              .filter(
                (candidate) =>
                  candidate.slotAllocationKey === booking.slotAllocationKey &&
                  candidate.status === "accepted"
              )
              .map(
                (candidate) =>
                  statuses[candidate.id]?.created_at ||
                  requestMap[candidate.id]?.created_at ||
                  0
              ),
            0
          )
        : -1;

      if (!currentWinner || bookingTs >= currentWinnerTs) {
        acc[booking.slotAllocationKey] = {
          studentId: booking.studentId,
          source: "booking"
        };
      }

      return acc;
    }, {});
  }, [allBookings, requestMap, statuses]);

  const activeBidBySlotAndStudent = useMemo(() => {
    return allBookings.reduce<Record<string, Booking>>((acc, booking) => {
      if (!isActiveBookingStatus(booking.status)) {
        return acc;
      }

      const slotBidKey = makeSlotBidKey(booking.tutorId, booking.studentId, {
        start: booking.scheduledAt,
        end: booking.scheduledEnd || ""
      });
      const existing = acc[slotBidKey];
      const bookingTs =
        statuses[booking.id]?.created_at || requestMap[booking.id]?.created_at || 0;
      const existingTs = existing
        ? statuses[existing.id]?.created_at || requestMap[existing.id]?.created_at || 0
        : -1;

      if (!existing || bookingTs >= existingTs) {
        acc[slotBidKey] = booking;
      }

      return acc;
    }, {});
  }, [allBookings, requestMap, statuses]);

  const bookingRepository = useMemo<BookingRepository>(() => {
    const repo: BookingRepository = {
      async getIncoming(targetUserId: string) {
        return targetUserId === userId ? incoming : [];
      },
      async getOutgoing(targetUserId: string) {
        return targetUserId === userId ? outgoing : [];
      },
      async getById(id: string) {
        return incoming.find((booking) => booking.id === id) ||
          outgoing.find((booking) => booking.id === id) ||
          null;
      },
      async getByAllocationKey(allocationKey: string) {
        return requestsByAllocationKey[allocationKey] || [];
      },
      async updateStatus(
        id: string,
        status: Booking["status"],
        options?: { reason?: Booking["resolutionReason"] }
      ) {
        const request = requestMap[id];
        if (!request) {
          return;
        }
        if (status === "pending") {
          return;
        }
        const recipient =
          status === "cancelled" ? request.tutorPubkey : request.pubkey;

        await publishBookingStatus(recipient, {
          bookingId: id,
          status: bookingStatusToNostr(status),
          reason: options?.reason,
          slotAllocationKey:
            request.request.slotAllocationKey ||
            makeSlotAllocationKey(request.tutorPubkey, request.request.requestedSlot)
        });
      }
    };

    return repo;
  }, [
    incoming,
    outgoing,
    publishBookingStatus,
    requestMap,
    requestsByAllocationKey,
    userId
  ]);

  const acceptBooking = useMemo(
    () =>
      new AcceptBooking(bookingRepository, lessonRepository, ({ bookingId, tutorId, studentId, scheduledAt }) => {
        const request = requestMap[bookingId];
        const startTime = Date.parse(scheduledAt);
        const endTime = Date.parse(request?.request.requestedSlot.end || "");
        const durationMin =
          Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime
            ? lessonDefaults?.durationMin || 60
            : Math.max(15, Math.round((endTime - startTime) / 60000));

        return {
          id: bookingId,
          bookingId,
          tutorId,
          studentId,
          scheduledAt,
          durationMin,
          subject: lessonDefaults?.subject || "Tutoring lesson",
          status: "scheduled"
        };
      }),
    [bookingRepository, lessonDefaults?.durationMin, lessonDefaults?.subject, lessonRepository, requestMap]
  );

  return {
    incoming,
    outgoing,
    latestIncomingRequestTs,
    requestsByAllocationKey,
    winnerByAllocationKey,
    activeBidBySlotAndStudent,
    bookingRepository,
    acceptBooking,
    getById(id: string) {
      return bookingRepository.getById(id);
    }
  };
}
