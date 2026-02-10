import { useCallback } from "react";
import { nostrClient } from "../nostr/client";
import { BookingRequest, BookingStatus } from "../types/nostr";

function makeBookingId() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return `${Date.now().toString(36)}-${random}`;
}

export function useBookingActions() {
  const publishBookingRequest = useCallback(
    async (tutorPubkey: string, payload: Omit<BookingRequest, "bookingId">) => {
      const bookingId = makeBookingId();
      const request: BookingRequest = {
        ...payload,
        bookingId
      };
      const tags: string[][] = [
        ["p", tutorPubkey],
        ["t", "booking:request"],
        ["d", bookingId]
      ];
      await nostrClient.publishEvent(30002, JSON.stringify(request), tags);
      return bookingId;
    },
    []
  );

  const publishBookingStatus = useCallback(
    async (
      studentPubkey: string,
      payload: Omit<BookingStatus, "bookingId"> & { bookingId: string }
    ) => {
      const status: BookingStatus = {
        bookingId: payload.bookingId,
        status: payload.status,
        note: payload.note
      };
      const tags: string[][] = [
        ["p", studentPubkey],
        ["t", "booking:status"],
        ["d", payload.bookingId]
      ];
      await nostrClient.publishReplaceableEvent(
        30003,
        JSON.stringify(status),
        tags
      );
    },
    []
  );

  return { publishBookingRequest, publishBookingStatus };
}
