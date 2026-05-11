import { useMemo } from "react";
import { createNostrPrivateMessagingRepository } from "../adapters/nostr/privateMessagingRepository";
import { PrivateMessagingRepository } from "../ports/privateMessagingRepository";

export function usePrivateMessagingRepository() {
  return useMemo<PrivateMessagingRepository>(
    () => createNostrPrivateMessagingRepository(),
    []
  );
}
