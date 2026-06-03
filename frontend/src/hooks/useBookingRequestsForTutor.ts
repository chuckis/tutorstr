import { useEffect, useMemo, useState } from "react";
import { BookingRequestEvent } from "../ports/bookingEventsRepository";
import { useBookingEventsRepository } from "./useBookingEventsRepository";

export function useBookingRequestsForTutor(pubkey: string) {
  const [requests, setRequests] = useState<Record<string, BookingRequestEvent>>(
    {}
  );
  const bookingEventsRepository = useBookingEventsRepository();

  useEffect(() => {
    const unsubscribe = bookingEventsRepository.subscribeRequestsForTutor(
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
      }
    );

    return () => unsubscribe();
  }, [bookingEventsRepository, pubkey]);

  const list = useMemo(
    () =>
      Object.values(requests).sort(
        (a, b) => b.created_at - a.created_at
      ),
    [requests]
  );

  return { requests: list };
}
