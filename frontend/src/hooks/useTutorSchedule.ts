import { useEffect, useState } from "react";
import { nostrClient } from "../nostr/client";
import { TutorSchedule } from "../types/nostr";
import { emptySchedule, normalizeSchedule } from "../utils/normalize";

const SCHEDULE_STORAGE = "tutorhub:schedule";

export function useTutorSchedule(pubkey: string) {
  const [schedule, setSchedule] = useState<TutorSchedule>(emptySchedule);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(SCHEDULE_STORAGE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TutorSchedule;
        setSchedule(normalizeSchedule(parsed));
      } catch {
        // ignore invalid cache
      }
    }

    const unsubscribe = nostrClient.subscribe(
      { kinds: [30001], authors: [pubkey], limit: 1 },
      (event) => {
        try {
          const parsed = normalizeSchedule(
            JSON.parse(event.content) as TutorSchedule
          );
          setSchedule(parsed);
          localStorage.setItem(SCHEDULE_STORAGE, JSON.stringify(parsed));
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  async function publishSchedule(nextSchedule: TutorSchedule) {
    setStatus("Publishing schedule...");

    const tags: string[][] = [["t", "role:tutor"]];

    try {
      const payload = normalizeSchedule(nextSchedule);
      await nostrClient.publishReplaceableEvent(
        30001,
        JSON.stringify(payload),
        tags
      );
      localStorage.setItem(SCHEDULE_STORAGE, JSON.stringify(payload));
      setStatus("Schedule published.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to publish schedule."
      );
    }
  }

  return {
    schedule,
    setSchedule,
    status,
    publishSchedule
  };
}
