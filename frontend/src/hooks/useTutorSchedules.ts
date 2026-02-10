import { useEffect, useState } from "react";
import { nostrClient } from "../nostr/client";
import { TutorScheduleEvent } from "../types/nostr";
import { normalizeSchedule } from "../utils/normalize";

export function useTutorSchedules() {
  const [schedules, setSchedules] = useState<
    Record<string, TutorScheduleEvent>
  >({});

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [30001], limit: 200 },
      (event) => {
        try {
          const parsed = normalizeSchedule(JSON.parse(event.content));
          setSchedules((prev) => {
            const existing = prev[event.pubkey];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }
            return {
              ...prev,
              [event.pubkey]: {
                pubkey: event.pubkey,
                created_at: event.created_at,
                schedule: parsed
              }
            };
          });
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return { schedules };
}
