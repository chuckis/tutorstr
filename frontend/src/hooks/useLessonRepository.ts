import { useMemo } from "react";
import { lessonFromNostr, lessonToNostrStatus } from "../adapters/nostr/lessonAdapter";
import { Lesson } from "../domain/lesson";
import { LessonRepository } from "../ports/lessonRepository";
import { useBookingActions } from "./useBookingActions";
import { useLessonAgreementsForUser } from "./useLessonAgreementsForUser";

export function useLessonRepository(
  userId: string,
  defaults?: {
    price?: number;
    currency?: string;
  }
) {
  const { agreements, list } = useLessonAgreementsForUser(userId);
  const { publishLessonAgreement, updateLessonAgreementStatus } = useBookingActions();

  return useMemo<LessonRepository>(() => {
    return {
      async getForUser(targetUserId: string) {
        if (targetUserId !== userId) {
          return [] as Lesson[];
        }
        return list.map(lessonFromNostr);
      },
      async getById(id: string) {
        const event = agreements[id];
        return event ? lessonFromNostr(event) : null;
      },
      async save(lesson: Lesson) {
        const event = agreements[lesson.id];
        await publishLessonAgreement(lesson.studentId, {
          bookingEventId: event?.bookingEventId || "",
          lessonId: lesson.id,
          bookingId: lesson.bookingId,
          subject: lesson.subject,
          scheduledAt: lesson.scheduledAt,
          durationMin: lesson.durationMin,
          price: defaults?.price || 0,
          currency: defaults?.currency || "USD",
          status: lessonToNostrStatus(lesson.status)
        });
      },
      async updateStatus(id: string, status: Lesson["status"]) {
        const event = agreements[id];
        if (!event) {
          return;
        }
        await updateLessonAgreementStatus(event.studentPubkey, {
          bookingEventId: event.bookingEventId || "",
          ...event.agreement,
          status: lessonToNostrStatus(status)
        });
      }
    };
  }, [
    agreements,
    defaults?.currency,
    defaults?.price,
    list,
    publishLessonAgreement,
    updateLessonAgreementStatus,
    userId
  ]);
}
