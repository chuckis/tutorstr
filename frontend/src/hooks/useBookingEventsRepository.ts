import { useMemo } from "react";
import { createNostrBookingEventsRepository } from "../adapters/nostr/bookingEventsRepository";
import { BookingEventsRepository } from "../ports/bookingEventsRepository";

export function useBookingEventsRepository() {
  return useMemo<BookingEventsRepository>(
    () => createNostrBookingEventsRepository(),
    []
  );
}
