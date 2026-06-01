import { isSameDay } from "date-fns";

export function isSameLocalDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
