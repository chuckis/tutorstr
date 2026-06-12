import { BookingRequest } from "../domain/booking";

export type BookingRequestEvent = {
  id: string;
  eventId: string;
  created_at: number;
  pubkey: string;
  tutorPubkey: string;
  request: BookingRequest;
};

export type BookingStatusPayload = {
  bookingId: string;
  status: "accepted" | "rejected" | "completed" | "cancelled";
  note?: string;
  reason?: "tutor_rejected" | "duplicate_bid" | "slot_filled" | "student_cancelled";
  slotAllocationKey?: string;
};

export type BookingStatusEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  studentPubkey: string;
  status: BookingStatusPayload;
};

export interface BookingEventsRepository {
  subscribeRequestsForTutor(
    pubkey: string,
    onRequest: (request: BookingRequestEvent) => void,
    since?: number
  ): () => void;
  subscribeRequestsByUser(
    pubkey: string,
    onRequest: (request: BookingRequestEvent) => void,
    since?: number
  ): () => void;
  subscribeStatusesForUser(
    pubkey: string,
    onStatus: (status: BookingStatusEvent) => void,
    since?: number
  ): () => void;
  publishBookingRequest(
    currentPubkey: string,
    tutorPubkey: string,
    payload: Omit<BookingRequest, "bookingId">
  ): Promise<string>;
  publishBookingStatus(
    studentPubkey: string,
    payload: Omit<BookingStatusPayload, "bookingId"> & { bookingId: string }
  ): Promise<void>;
}
