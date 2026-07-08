import type { Event } from "nostr-tools";

export interface DecryptedEvent {
  event: Event;
  plaintext: string;
  studentPubkey: string;
  tutorPubkey: string;
  isHomework: boolean;
  rootEventId?: string;
  isReply: boolean;
  parentEventId?: string;
  threadTag?: string;
}

export type HomeworkHandler = (decrypted: DecryptedEvent) => void | Promise<void>;

export interface INostrGateway {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribeHomeworkSubmissions(handler: HomeworkHandler): Promise<() => void>;
  sendEncrypted(params: {
    recipientPubkey: string;
    plaintext: string;
    tags: string[][];
  }): Promise<string>;
}
