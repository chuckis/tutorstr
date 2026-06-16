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

    scheduleEventRepository.fetchAll().catch(() => {}); // ← явный запрос к реле


    const unsubscribe = scheduleEventRepository.subscribeAll(
      (event) => {
        console.log('[SCHEDULE EVENT]', event.pubkey.slice(0,8), new Date(event.created_at * 1000).toLocaleDateString());
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
  }, [scheduleEventRepository]);

  return { schedules, loading };
}
