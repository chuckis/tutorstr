import { RelayManager } from "../../ports/relayManager";
import { nostrClient } from "../../nostr/client";

export function createNostrRelayManager(): RelayManager {
  return {
    setRelays(relays: string[]) {
      nostrClient.setRelays(relays);
    }
  };
}
