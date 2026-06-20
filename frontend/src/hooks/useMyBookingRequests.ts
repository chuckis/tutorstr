import { useMemo } from "react";
import { useBookingStore } from "../stores/bookingStore";

export function useMyBookingRequests(pubkey: string) {
  const allRequests = useBookingStore((s) => s.requests);
  const hydrated = useBookingStore((s) => s.hydrated);

  const requests = useMemo(
    () =>
      Object.values(allRequests)
        .filter((r) => r.pubkey === pubkey)
        .sort((a, b) => b.created_at - a.created_at),
    [allRequests, pubkey]
  );

  return { requests, loading: !hydrated };
}
