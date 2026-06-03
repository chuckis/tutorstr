export type EncryptedMessage = {
  id: string;
  created_at: number;
  pubkey: string;
  counterparty: string;
  threadKey: string;
  content: string;
};
