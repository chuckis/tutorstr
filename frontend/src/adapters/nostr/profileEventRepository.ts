import { ProfileEventRepository } from "../../ports/profileEventRepository";
import { nostrClient } from "../../nostr/client";

export function createNostrProfileEventRepository(): ProfileEventRepository {
  return {
    subscribe(pubkey, onEvent, options) {
      return nostrClient.subscribe(
        { kinds: [30000], authors: [pubkey], limit: options?.limit ?? 1 },
        onEvent,
        { onEose: options?.onEose }
      );
    },
    subscribeAll(onEvent, options) {
      return nostrClient.subscribe(
        { kinds: [30000], limit: options?.limit ?? 200 },
        onEvent
      );
    },
    async publish(_, content, tags) {
      const event = await nostrClient.publishReplaceableEvent(30000, content, tags);
      return event.id;
    }
  };
}
