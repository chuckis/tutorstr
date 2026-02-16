import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "../nostr/client";
import { BookingRequest, BookingRequestEvent } from "../types/nostr";
import { getTagValue } from "../utils/nostrTags";

export function useMyBookingRequests(pubkey: string) {
  const [requests, setRequests] = useState<Record<string, BookingRequestEvent>>(
    {}
  );

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [30002], authors: [pubkey], limit: 200 },
      (event) => {
        try {
          const parsed = JSON.parse(event.content) as BookingRequest;
          const bookingId =
            parsed.bookingId || getTagValue(event.tags, "d") || event.id;
          setRequests((prev) => {
            const existing = prev[bookingId];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }
            return {
              ...prev,
              [bookingId]: {
                id: bookingId,
                eventId: event.id,
                created_at: event.created_at,
                pubkey: event.pubkey,
                tutorPubkey: getTagValue(event.tags, "p") || "",
                request: {
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
    () =>
      Object.values(requests).sort(
        (a, b) => b.created_at - a.created_at
      ),
    [requests]
  );

  return { requests: list };
}
