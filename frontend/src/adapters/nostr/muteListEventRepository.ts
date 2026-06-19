import { MuteListRepository } from "../../ports/muteListRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";

export function createNostrMuteListRepository(): MuteListRepository {
  return {
    subscribe(pubkey, onEvent) {
      return addKindListener(TutorHubKind.MuteList, (event) => {
        if (event.pubkey !== pubkey) return;
        onEvent(event);
      });
    },

    subscribeAll(onEvent) {
      return addKindListener(TutorHubKind.MuteList, onEvent);
    },

    async publish(_, mutedPubkeys) {
      const tags = mutedPubkeys.map((pk) => ["p", pk]);
      const event = await nostrClient.publishReplaceableEvent(
        TutorHubKind.MuteList,
        "",
        tags,
      );
      return event.id;
    },
  };
}
