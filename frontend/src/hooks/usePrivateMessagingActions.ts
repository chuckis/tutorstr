import { useCallback } from "react";
import { nostrClient } from "../nostr/client";
import { ProgressEntry } from "../types/nostr";

export function usePrivateMessagingActions() {
  const sendMessage = useCallback(async (recipientPubkey: string, text: string) => {
    if (!text.trim()) {
      return;
    }
    await nostrClient.publishEncryptedEvent(4, recipientPubkey, text);
  }, []);

  const sendProgressEntry = useCallback(
    async (recipientPubkey: string, entry: ProgressEntry) => {
      await nostrClient.publishEncryptedEvent(
        30004,
        recipientPubkey,
        JSON.stringify(entry)
      );
    },
    []
  );

  return { sendMessage, sendProgressEntry };
}
