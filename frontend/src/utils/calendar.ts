import { addDays, startOfWeek, isSameDay } from "date-fns";

export function buildWeekDays(anchor: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeekRangeLabel(weekDays: Date[], locale: string): string {
  if (weekDays.length === 0) {
    return "";
  }

  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  const sameYear = first.getFullYear() === last.getFullYear();

  const firstFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const lastFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${firstFormat.format(first)} – ${lastFormat.format(last)}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
