import { PublicLessonRepository } from "../../ports/publicLessonRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { addKindListener } from "./eventBus";

export function createNostrPublicLessonRepository(): PublicLessonRepository {
  return {
    subscribeAll(onEvent) {
      return addKindListener(TutorHubKind.LessonAgreement, onEvent);
    },
  };
}
