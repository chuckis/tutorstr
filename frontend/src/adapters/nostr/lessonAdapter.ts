import { Lesson, LessonStatus } from "../../domain/lesson";
import { LessonAgreement, LessonAgreementEvent } from "../../types/nostr";

function toLessonStatus(status: string): LessonStatus {
  if (status === "completed") {
    return "completed";
  }
  if (status === "cancelled") {
    return "canceled";
  }
  return "scheduled";
}

export function lessonFromNostr(event: LessonAgreementEvent): Lesson {
  return {
    id: event.lessonId,
    bookingId: event.agreement.bookingId,
    tutorId: event.tutorPubkey,
    studentId: event.studentPubkey,
    scheduledAt: event.agreement.scheduledAt,
    durationMin: event.agreement.durationMin,
    subject: event.agreement.subject,
    status: toLessonStatus(event.agreement.status)
  };
}

export function lessonToNostrStatus(status: LessonStatus): LessonAgreement["status"] {
  if (status === "canceled") {
    return "cancelled";
  }
  return status;
}
