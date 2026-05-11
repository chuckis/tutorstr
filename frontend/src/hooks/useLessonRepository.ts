import { useMemo } from "react";
import { createNostrLessonRepository } from "../adapters/nostr/lessonRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { useLessonAgreementEventsRepository } from "./useLessonAgreementEventsRepository";
import { useLessonAgreementsForUser } from "./useLessonAgreementsForUser";

export function useLessonRepository(
  userId: string,
  defaults?: {
    price?: number;
    currency?: string;
  }
) {
  const { agreements, list } = useLessonAgreementsForUser(userId);
  const lessonAgreementEventsRepository = useLessonAgreementEventsRepository();

  return useMemo<LessonRepository>(() => {
    return createNostrLessonRepository({
      userId,
      list,
      agreements,
      defaults,
      publishLessonAgreement: (studentPubkey, payload) =>
        lessonAgreementEventsRepository.publishLessonAgreement(
          userId,
          studentPubkey,
          payload
        ),
      updateLessonAgreementStatus: (studentPubkey, payload) =>
        lessonAgreementEventsRepository.updateLessonAgreementStatus(
          userId,
          studentPubkey,
          payload
        )
    });
  }, [
    agreements,
    defaults?.currency,
    defaults?.price,
    lessonAgreementEventsRepository,
    list,
    userId
  ]);
}
