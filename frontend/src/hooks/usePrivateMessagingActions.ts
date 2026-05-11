import { useCallback } from "react";
import { ProgressEntry } from "../types/nostr";
import { usePrivateMessagingRepository } from "./usePrivateMessagingRepository";

export function usePrivateMessagingActions() {
  const messagingRepository = usePrivateMessagingRepository();

  const sendMessage = useCallback(async (recipientPubkey: string, text: string) => {
    await messagingRepository.sendMessage(recipientPubkey, text);
  }, [messagingRepository]);

  const sendProgressEntry = useCallback(
    async (recipientPubkey: string, entry: ProgressEntry) => {
      await messagingRepository.sendProgressEntry(recipientPubkey, entry);
    },
    [messagingRepository]
  );

  return { sendMessage, sendProgressEntry };
}
