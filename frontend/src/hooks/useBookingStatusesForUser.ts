import { useEffect, useMemo, useState } from "react";
import { BookingStatusEvent } from "../ports/bookingEventsRepository";
import { useBookingEventsRepository } from "./useBookingEventsRepository";

const LOAD_TIMEOUT = 8000;

export function useBookingStatusesForUser(pubkey: string) {
  const [statuses, setStatuses] = useState<
    Record<string, BookingStatusEvent>
  >({});
  const [loading, setLoading] = useState(true);
  const bookingEventsRepository = useBookingEventsRepository();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);

    const unsub = bookingEventsRepository.subscribeStatusesForUser(
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
        setLoading(false);
        clearTimeout(timer);
      }
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [bookingEventsRepository, pubkey]);

  const list = useMemo(
    () => Object.values(statuses),
    [statuses]
  );

  return { statuses, list, loading };
}
