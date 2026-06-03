import { SignerManager } from "../../ports/signerManager";
import { NostrSigner } from "../../ports/nostrSigner";
import { nostrClient } from "../../nostr/client";

export function createNostrSignerManager(): SignerManager {
  return {
    setSigner(signer) {
      nostrClient.setSigner(signer);
    },
    getSignerSession() {
      return nostrClient.getSignerSession();
    },
    getSigner(): NostrSigner | null {
      return nostrClient.getSigner();
    }
  };
}
