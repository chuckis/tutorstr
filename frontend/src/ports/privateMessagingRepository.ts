import { EncryptedMessage, ProgressEntry, ProgressEntryEvent } from "../types/nostr";

export interface PrivateMessagingRepository {
  subscribeMessagesForUser(
    pubkey: string,
    onMessage: (message: EncryptedMessage) => void
  ): () => void;
  subscribeProgressEntriesForUser(
    pubkey: string,
    onEntry: (entry: ProgressEntryEvent) => void
  ): () => void;
  sendMessage(recipientPubkey: string, text: string, threadKey?: string): Promise<void>;
  sendProgressEntry(recipientPubkey: string, entry: ProgressEntry): Promise<void>;
}
