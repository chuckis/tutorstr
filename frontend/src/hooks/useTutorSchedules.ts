import { useScheduleStore } from "../stores/scheduleStore";

export function useTutorSchedules() {
  const schedules = useScheduleStore((s) => s.byPubkey);
  const hydrated = useScheduleStore((s) => s.hydrated);

  return { schedules, loading: !hydrated };
}
