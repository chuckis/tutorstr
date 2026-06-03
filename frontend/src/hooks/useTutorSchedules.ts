import { useEffect, useState } from "react";
import { useRepo } from "./RepoContext";
import { TutorScheduleEvent } from "../ports/eventTypes";
import { normalizeSchedule } from "../utils/normalize";

export function useTutorSchedules() {
  const { scheduleEventRepository } = useRepo();
  const [schedules, setSchedules] = useState<
    Record<string, TutorScheduleEvent>
  >({});

  useEffect(() => {
    const unsubscribe = scheduleEventRepository.subscribeAll(
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
