import { useMemo } from "react";
import { bookingFromNostr, bookingStatusToNostr } from "../adapters/nostr/bookingAdapter";
import { AcceptBooking } from "../application/usecases/acceptBooking";
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
      async updateStatus(id: string, status: Booking["status"]) {
        const request = requestMap[id];
        if (!request) {
          return;
        }
        const recipient =
          status === "cancelled" ? request.tutorPubkey : request.pubkey;

        await publishBookingStatus(recipient, {
          bookingId: id,
          status: bookingStatusToNostr(status)
        });
      }
    };

    return repo;
  }, [incoming, outgoing, publishBookingStatus, requestMap, userId]);

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
    bookingRepository,
    acceptBooking,
    getById(id: string) {
      return bookingRepository.getById(id);
    }
  };
}
