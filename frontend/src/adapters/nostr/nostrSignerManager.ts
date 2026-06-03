import { SignerManager } from "../../ports/signerManager";
import { nostrClient } from "../../nostr/client";

export function createNostrSignerManager(): SignerManager {
  return {
    setSigner(signer) {
      nostrClient.setSigner(signer);
    },
    getSignerSession() {
      return nostrClient.getSignerSession();
    }
  };
}
