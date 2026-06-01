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
