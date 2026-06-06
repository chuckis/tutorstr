import { Booking } from "./booking";
import { Lesson } from "./lesson";
import { MessageThreadInfo } from "./messaging";

export function fallbackDirectMessageThreadKey(counterparty: string): MessageThreadInfo {
  return {
    threadKey: `dm:${counterparty}`,
    type: "dm",
    refId: counterparty,
  };
}

export function requestMessageThreadKey(request: Pick<Booking, "id">): MessageThreadInfo {
  return {
    threadKey: `request:${request.id}`,
    type: "booking",
    refId: request.id,
  };
}

export function lessonMessageThreadKey(lesson: Pick<Lesson, "id">): MessageThreadInfo {
  return {
    threadKey: `lesson:${lesson.id}`,
    type: "lesson",
    refId: lesson.id,
  };
}
