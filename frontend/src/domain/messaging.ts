export type MessageAttachment = {
  url: string;
  mimeType: string;
  fileName?: string;
  size?: number;
  thumbnailUrl?: string;
  encryptionKey?: string;
};

export type MessageThreadType = "dm" | "booking" | "lesson";

export type MessageThreadInfo = {
  threadKey: string;
  type: MessageThreadType;
  refId: string;
};

export type EncryptedMessage = {
  id: string;
  created_at: number;
  pubkey: string;
  counterparty: string;
  threadKey: string;
  threadInfo?: MessageThreadInfo;
  content: string;
  attachments: MessageAttachment[];
};
