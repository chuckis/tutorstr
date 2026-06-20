import { useMemo } from "react";
import { useBookingStore } from "../stores/bookingStore";

export function useBookingStatusesForUser(pubkey: string) {
  const allStatuses = useBookingStore((s) => s.statuses);
  const hydrated = useBookingStore((s) => s.hydrated);

  const statuses = useMemo(() => {
    const filtered: typeof allStatuses = {};
    for (const [id, status] of Object.entries(allStatuses)) {
      if (status.pubkey === pubkey || status.studentPubkey === pubkey) {
        filtered[id] = status;
      }
    }
    return filtered;
  }, [allStatuses, pubkey]);

  const list = useMemo(() => Object.values(statuses), [statuses]);

  return { statuses, list, loading: !hydrated };
}
