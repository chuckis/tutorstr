import { useMemo } from "react";
import { useCurrentTime } from "./useCurrentTime";
import { TutorSchedule } from "../domain/schedule";
import { isSlotInPast } from "../domain/TimeSlot";
import { isSlotAvailable, tutorIsAvailableNow, tutorHasFreeSlotsThisWeek } from "../domain/tutorSelectors";
import { TimeSlot } from "../domain/TimeSlot";

export type SlotFilterResult = {
  futureSlots: TimeSlot[];
  isAvailableNow: boolean;
  hasFreeSlotsThisWeek: boolean;
};

const EMPTY_FILTER: SlotFilterResult = {
  futureSlots: [],
  isAvailableNow: false,
  hasFreeSlotsThisWeek: false,
};

export function useSlotFilter(
  schedule: TutorSchedule | undefined,
  tutorPubkey: string,
  occupiedKeys: Set<string>,
): SlotFilterResult {
  const now = useCurrentTime(60_000);

  return useMemo(() => {
    if (!schedule) return EMPTY_FILTER;

    return {
      futureSlots: schedule.slots.filter((s) => !isSlotInPast(s, now)),
      isAvailableNow: tutorIsAvailableNow(schedule, tutorPubkey, occupiedKeys, now),
      hasFreeSlotsThisWeek: tutorHasFreeSlotsThisWeek(schedule, tutorPubkey, occupiedKeys, now),
    };
  }, [schedule, now, tutorPubkey, occupiedKeys]);
}
