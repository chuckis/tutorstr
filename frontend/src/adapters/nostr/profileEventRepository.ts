import { ProfileEventRepository } from "../../ports/profileEventRepository";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";

export function createNostrProfileEventRepository(): ProfileEventRepository {
  return {
    subscribe(pubkey, onEvent) {
      return addKindListener(0, (event) => {
        if (event.pubkey !== pubkey) return;
        onEvent(event);
      });
    },
    subscribeAll(onEvent) {
      return addKindListener(0, onEvent);
    },
    async publish(_, content, tags) {
      const event = await nostrClient.publishReplaceableEvent(0, content, tags);
      return event.id;
    },
  };
}
