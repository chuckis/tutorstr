import { Lesson } from "../../domain/lesson";
import { BookingRequestEvent } from "../../ports/bookingEventsRepository";

export type AcceptedLessonFactory = (input: {
  bookingId: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
}) => Lesson;

type BuildAcceptedLessonFactoryParams = {
  requestMap: Record<string, BookingRequestEvent>;
  defaults?: {
    durationMin?: number;
    subject?: string;
  };
};

export function createAcceptedLessonFactory({
  requestMap,
  defaults
}: BuildAcceptedLessonFactoryParams): AcceptedLessonFactory {
  return ({ bookingId, tutorId, studentId, scheduledAt }) => {
    const request = requestMap[bookingId];
    const startTime = Date.parse(scheduledAt);
    const endTime = Date.parse(request?.request.requestedSlot.end || "");
    const durationMin =
      Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime
        ? defaults?.durationMin || 60
        : Math.max(15, Math.round((endTime - startTime) / 60000));

    return {
      id: bookingId,
      bookingId,
      tutorId,
      studentId,
      scheduledAt,
      durationMin,
      subject: defaults?.subject || "",
      status: "scheduled"
    };
  };
}
