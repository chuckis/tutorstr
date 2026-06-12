import { ScheduleEventRepository } from "../../ports/scheduleEventRepository";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";

export function createNostrScheduleEventRepository(): ScheduleEventRepository {
  return {
    subscribe(pubkey, onEvent) {
      return addKindListener(30001, (event) => {
        if (event.pubkey !== pubkey) return;
        onEvent(event);
      });
    },
    subscribeAll(onEvent) {
      return addKindListener(30001, onEvent);
    },
    async publish(_, content, tags) {
      const event = await nostrClient.publishReplaceableEvent(30001, content, tags);
      return event.id;
    },
  };
}
