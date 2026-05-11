import { ParsedSecretInput } from "../domain/auth";

export type NostrKeyMaterial = {
  generateSecretKey: () => string;
  derivePublicKey: (secretKeyHex: string) => string;
  encodeNsec: (secretKeyHex: string) => string;
  encodeNpub: (pubkey: string) => string;
  parseSecretInput: (value: string) => Promise<ParsedSecretInput>;
};
