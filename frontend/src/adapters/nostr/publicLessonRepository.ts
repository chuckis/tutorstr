import { PublicLessonRepository } from "../../ports/publicLessonRepository";
import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";

export function createNostrPublicLessonRepository(): PublicLessonRepository {
  return {
    subscribeAll(onEvent, options) {
      return nostrClient.subscribe(
        { kinds: [TutorHubKind.LessonAgreement], limit: options?.limit ?? 400 },
        onEvent
      );
    }
  };
}
