import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "../nostr/client";
import { BookingStatus, BookingStatusEvent } from "../types/nostr";
import { getTagValue } from "../utils/nostrTags";

export function useBookingStatusesForUser(pubkey: string) {
  const [statuses, setStatuses] = useState<
    Record<string, BookingStatusEvent>
  >({});

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [30003], "#p": [pubkey], limit: 200 },
      (event) => {
        try {
          const parsed = JSON.parse(event.content) as BookingStatus;
          const bookingId =
            parsed.bookingId || getTagValue(event.tags, "d") || event.id;
          setStatuses((prev) => {
            const existing = prev[bookingId];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }
            return {
              ...prev,
              [bookingId]: {
                id: bookingId,
                created_at: event.created_at,
                pubkey: event.pubkey,
                studentPubkey: getTagValue(event.tags, "p") || pubkey,
                status: {
                  ...parsed,
                  bookingId
                }
              }
            };
          });
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  const list = useMemo(
    () => Object.values(statuses),
    [statuses]
  );

  return { statuses, list };
}
