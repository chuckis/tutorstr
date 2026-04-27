import { useMemo } from "react";
import { nostrClient } from "../nostr/client";

export function useNostrKeypair() {
  return useMemo(() => {
    const session = nostrClient.getSignerSession();
    if (!session) {
      throw new Error("Authentication session is not ready.");
    }

    return session;
  }, []);
}
