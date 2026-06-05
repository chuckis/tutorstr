import { useEffect, useMemo, useState } from "react";
import { BookingRequestEvent } from "../ports/bookingEventsRepository";
import { useBookingEventsRepository } from "./useBookingEventsRepository";

const LOAD_TIMEOUT = 8000;

export function useMyBookingRequests(pubkey: string) {
  const [requests, setRequests] = useState<Record<string, BookingRequestEvent>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const bookingEventsRepository = useBookingEventsRepository();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);

    const unsubscribe = bookingEventsRepository.subscribeRequestsByUser(
      pubkey,
      (request) => {
        setRequests((prev) => {
          const existing = prev[request.id];
          if (existing && existing.created_at >= request.created_at) {
            return prev;
          }
          return {
            ...prev,
            [request.id]: request
          };
        });
        setLoading(false);
        clearTimeout(timer);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [bookingEventsRepository, pubkey]);

  const list = useMemo(
    () =>
      Object.values(requests).sort(
        (a, b) => b.created_at - a.created_at
      ),
    [requests]
  );

  return { requests: list, loading };
}
