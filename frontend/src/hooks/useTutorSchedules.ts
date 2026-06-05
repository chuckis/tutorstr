import { useEffect, useState } from "react";
import { useRepo } from "./RepoContext";
import { TutorScheduleEvent } from "../ports/eventTypes";
import { normalizeSchedule } from "../utils/normalize";

const LOAD_TIMEOUT = 8000;

export function useTutorSchedules() {
  const { scheduleEventRepository } = useRepo();
  const [schedules, setSchedules] = useState<
    Record<string, TutorScheduleEvent>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);

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
          setLoading(false);
          clearTimeout(timer);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return { schedules, loading };
}
