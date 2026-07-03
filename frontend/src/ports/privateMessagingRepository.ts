import { EncryptedMessage, MessageAttachment } from "../domain/messaging";
import { ProgressEntry } from "../domain/progress";

export type ProgressEntryEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  counterparty: string;
  entry: ProgressEntry;
};

export type AttachmentMessagePayload = {
  text?: string;
  attachments: MessageAttachment[];
};

export interface PrivateMessagingRepository {
  subscribeMessagesForUser(
    pubkey: string,
    onMessage: (message: EncryptedMessage) => void,
    since?: number
  ): () => void;
  subscribeProgressEntriesForUser(
    pubkey: string,
    onEntry: (entry: ProgressEntryEvent) => void
  ): () => void;
  sendMessage(recipientPubkey: string, text: string, threadKey?: string): Promise<void>;
  sendHomeworkMessage(
    recipientPubkey: string,
    text: string,
    tutorPubkey: string,
    threadKey?: string,
  ): Promise<void>;
  sendAttachmentMessage(
    recipientPubkey: string,
    payload: AttachmentMessagePayload,
    threadKey?: string
  ): Promise<void>;
  sendProgressEntry(recipientPubkey: string, entry: ProgressEntry): Promise<void>;
}
