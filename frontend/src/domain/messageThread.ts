import { Booking } from "./booking";
import { Lesson } from "./lesson";

export function fallbackDirectMessageThreadKey(counterparty: string) {
  return `dm:${counterparty}`;
}

export function requestMessageThreadKey(request: Pick<Booking, "id">) {
  return `request:${request.id}`;
}

export function lessonMessageThreadKey(lesson: Pick<Lesson, "id">) {
  return `lesson:${lesson.id}`;
}
