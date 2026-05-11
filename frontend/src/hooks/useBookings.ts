import { useMemo } from "react";
import { bookingFromNostr } from "../adapters/nostr/bookingAdapter";
import { createNostrBookingRepository } from "../adapters/nostr/bookingRepository";
import { AcceptBooking } from "../application/usecases/acceptBooking";
import { createAcceptedLessonFactory } from "../application/usecases/createAcceptedLessonFactory";
import {
  buildRequestsByAllocationKey,
  selectActiveBidBySlotAndStudent,
  selectWinningOccupancyByAllocationKey
} from "../domain/bookingSelectors";
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
  const { publishBookingStatus } = useBookingActions(userId);
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
    return buildRequestsByAllocationKey(allBookings, statuses, requestMap);
  }, [allBookings, requestMap, statuses]);

  const winnerByAllocationKey = useMemo(() => {
    return selectWinningOccupancyByAllocationKey(allBookings, statuses, requestMap);
  }, [allBookings, requestMap, statuses]);

  const activeBidBySlotAndStudent = useMemo(() => {
    return selectActiveBidBySlotAndStudent(allBookings, statuses, requestMap);
  }, [allBookings, requestMap, statuses]);

  const bookingRepository = useMemo<BookingRepository>(() => {
    return createNostrBookingRepository({
      userId,
      incoming,
      outgoing,
      requestMap,
      requestsByAllocationKey,
      publishBookingStatus
    });
  }, [
    incoming,
    outgoing,
    publishBookingStatus,
    requestMap,
    requestsByAllocationKey,
    userId
  ]);

  const acceptedLessonFactory = useMemo(
    () =>
      createAcceptedLessonFactory({
        requestMap,
        defaults: {
          durationMin: lessonDefaults?.durationMin,
          subject: lessonDefaults?.subject
        }
      }),
    [lessonDefaults?.durationMin, lessonDefaults?.subject, requestMap]
  );

  const acceptBooking = useMemo(
    () =>
      new AcceptBooking(bookingRepository, lessonRepository, acceptedLessonFactory),
    [acceptedLessonFactory, bookingRepository, lessonRepository]
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
