import { ScheduleEventRepository } from "../../ports/scheduleEventRepository";
import { nostrClient } from "../../nostr/client";

export function createNostrScheduleEventRepository(): ScheduleEventRepository {
  return {
    subscribe(pubkey, onEvent) {
      return nostrClient.subscribe(
        { kinds: [30001], authors: [pubkey], limit: 1 },
        onEvent
      );
    },
    subscribeAll(onEvent, options) {
      return nostrClient.subscribe(
        { kinds: [30001], limit: options?.limit ?? 200 },
        onEvent
      );
    },
    async publish(_, content, tags) {
      const event = await nostrClient.publishReplaceableEvent(30001, content, tags);
      return event.id;
    }
  };
}
