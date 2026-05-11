import { BookingRequest, BookingRequestEvent, BookingStatus, BookingStatusEvent } from "../types/nostr";

export interface BookingEventsRepository {
  subscribeRequestsForTutor(
    pubkey: string,
    onRequest: (request: BookingRequestEvent) => void
  ): () => void;
  subscribeRequestsByUser(
    pubkey: string,
    onRequest: (request: BookingRequestEvent) => void
  ): () => void;
  subscribeStatusesForUser(
    pubkey: string,
    onStatus: (status: BookingStatusEvent) => void
  ): () => void;
  publishBookingRequest(
    currentPubkey: string,
    tutorPubkey: string,
    payload: Omit<BookingRequest, "bookingId">
  ): Promise<string>;
  publishBookingStatus(
    studentPubkey: string,
    payload: Omit<BookingStatus, "bookingId"> & { bookingId: string }
  ): Promise<void>;
}
