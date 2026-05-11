import { Lesson } from "../../domain/lesson";
import { LessonRepository } from "../../ports/lessonRepository";
import { LessonAgreementEvent } from "../../types/nostr";
import { lessonFromNostr, lessonToNostrStatus } from "./lessonAdapter";

type PublishLessonAgreement = (
  studentPubkey: string,
  payload: {
    bookingEventId: string;
    lessonId: string;
    bookingId: string;
    subject: string;
    scheduledAt: string;
    durationMin: number;
    price: number;
    currency: string;
    status: ReturnType<typeof lessonToNostrStatus>;
  }
) => Promise<void>;

type UpdateLessonAgreementStatus = (
  studentPubkey: string,
  payload: LessonAgreementEvent["agreement"] & {
    bookingEventId: string;
    status: ReturnType<typeof lessonToNostrStatus>;
  }
) => Promise<void>;

type CreateNostrLessonRepositoryParams = {
  userId: string;
  list: LessonAgreementEvent[];
  agreements: Record<string, LessonAgreementEvent>;
  defaults?: {
    price?: number;
    currency?: string;
  };
  publishLessonAgreement: PublishLessonAgreement;
  updateLessonAgreementStatus: UpdateLessonAgreementStatus;
};

export function createNostrLessonRepository({
  userId,
  list,
  agreements,
  defaults,
  publishLessonAgreement,
  updateLessonAgreementStatus
}: CreateNostrLessonRepositoryParams): LessonRepository {
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
}
