import { TimeSlot } from "../../domain/TimeSlot";
import { isSameLocalDay } from "./isSameLocalDay";

function parseLocalDateTime(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function groupSlotsByDay(
  slots: TimeSlot[],
  weekDays: Date[]
): TimeSlot[][] {
  const buckets: TimeSlot[][] = weekDays.map(() => []);

  for (const slot of slots) {
    const startDate = parseLocalDateTime(slot.start);
    if (!startDate) {
      continue;
    }

    const dayIndex = weekDays.findIndex((day) => isSameLocalDay(day, startDate));
    if (dayIndex === -1) {
      continue;
    }

    buckets[dayIndex].push(slot);
  }

  for (const bucket of buckets) {
    bucket.sort((a, b) => a.start.localeCompare(b.start));
  }

  return buckets;
}
