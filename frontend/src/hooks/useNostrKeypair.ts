import { useMemo } from "react";
import { nostrClient } from "../nostr/client";

export function useNostrKeypair() {
  return useMemo(() => nostrClient.getOrCreateKeypair(), []);
}
