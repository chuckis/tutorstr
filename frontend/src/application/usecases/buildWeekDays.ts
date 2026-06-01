import { addDays, startOfWeek } from "date-fns";

export function buildWeekDays(anchor: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}
