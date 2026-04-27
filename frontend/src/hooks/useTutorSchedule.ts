import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";
import { TutorSchedule } from "../types/nostr";
import { emptySchedule, normalizeSchedule } from "../utils/normalize";

export function useTutorSchedule(pubkey: string) {
  const { t } = useI18n();
  const [schedule, setSchedule] = useState<TutorSchedule>(emptySchedule);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const scheduleStorageKey = `tutorhub:schedule:${pubkey}`;
    const stored = localStorage.getItem(scheduleStorageKey);
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
          localStorage.setItem(scheduleStorageKey, JSON.stringify(parsed));
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  async function publishSchedule(nextSchedule: TutorSchedule) {
    setStatus(t("schedule.publish"));

    const tags: string[][] = [["t", "role:tutor"]];

    try {
      const payload = normalizeSchedule(nextSchedule);
      await nostrClient.publishReplaceableEvent(
        30001,
        JSON.stringify(payload),
        tags
      );
      localStorage.setItem(`tutorhub:schedule:${pubkey}`, JSON.stringify(payload));
      setStatus(t("schedule.publish"));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t("schedule.publish")
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
