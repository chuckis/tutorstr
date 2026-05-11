import { useMemo } from "react";
import { createNostrLessonAgreementEventsRepository } from "../adapters/nostr/lessonAgreementEventsRepository";
import { LessonAgreementEventsRepository } from "../ports/lessonAgreementEventsRepository";

export function useLessonAgreementEventsRepository() {
  return useMemo<LessonAgreementEventsRepository>(
    () => createNostrLessonAgreementEventsRepository(),
    []
  );
}
