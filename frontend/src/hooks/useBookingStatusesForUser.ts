import { useEffect, useMemo, useState } from "react";
import { BookingStatusEvent } from "../types/nostr";
import { useBookingEventsRepository } from "./useBookingEventsRepository";

export function useBookingStatusesForUser(pubkey: string) {
  const [statuses, setStatuses] = useState<
    Record<string, BookingStatusEvent>
  >({});
  const bookingEventsRepository = useBookingEventsRepository();

  useEffect(() => {
    return bookingEventsRepository.subscribeStatusesForUser(
      pubkey,
      (statusEvent) => {
        setStatuses((prev) => {
          const existing = prev[statusEvent.id];
          if (existing && existing.created_at >= statusEvent.created_at) {
            return prev;
          }
          return {
            ...prev,
            [statusEvent.id]: statusEvent
          };
        });
      }
    );
  }, [bookingEventsRepository, pubkey]);

  const list = useMemo(
    () => Object.values(statuses),
    [statuses]
  );

  return { statuses, list };
}
