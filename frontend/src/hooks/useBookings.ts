import { useMemo } from "react";
import {
  createNostrBookingRepository,
  mapNostrBookings
} from "./RepoContext";
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
  const { requests: incomingRequests, loading: loadingIncoming } = useBookingRequestsForTutor(userId);
  const { requests: outgoingRequests, loading: loadingOutgoing } = useMyBookingRequests(userId);
  const { statuses, loading: loadingStatuses } = useBookingStatusesForUser(userId);
  const { publishBookingStatus } = useBookingActions(userId);
  const lessonRepository = useLessonRepository(userId, lessonDefaults);

  const incoming = useMemo(
    () => mapNostrBookings(incomingRequests, statuses),
    [incomingRequests, statuses]
  );
  const outgoing = useMemo(
    () => mapNostrBookings(outgoingRequests, statuses),
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

  const loading = loadingIncoming || loadingOutgoing || loadingStatuses;

  const statusesList = useMemo(
    () => Object.values(statuses),
    [statuses]
  );

  return {
    incoming,
    outgoing,
    loading,
    latestIncomingRequestTs,
    requestsByAllocationKey,
    winnerByAllocationKey,
    activeBidBySlotAndStudent,
    bookingRepository,
    acceptBooking,
    requestMap,
    statuses,
    statusesList,
    getById(id: string) {
      return bookingRepository.getById(id);
    }
  };
}
