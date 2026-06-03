import { useMemo } from "react";
import { createNostrLessonRepository } from "./RepoContext";
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
      publishLessonAgreement: (tutorPubkey, studentPubkey, payload) =>
        lessonAgreementEventsRepository.publishLessonAgreement(
          userId,
          tutorPubkey,
          studentPubkey,
          payload
        ),
      updateLessonAgreementStatus: (tutorPubkey, studentPubkey, payload) =>
        lessonAgreementEventsRepository.updateLessonAgreementStatus(
          userId,
          tutorPubkey,
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
