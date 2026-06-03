import { AuthSession } from "../domain/auth";

export type SignEventDraft = {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

export type SignedEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export interface NostrSigner {
  getSession(): AuthSession;
  signEvent(draft: SignEventDraft): Promise<SignedEvent>;
  encrypt(recipientPubkey: string, plaintext: string): Promise<string>;
  decrypt(senderPubkey: string, ciphertext: string): Promise<string | null>;
}
