import { nip04 } from "nostr-tools";
import { finalizeEvent } from "nostr-tools/pure";
import { AuthSession, MissingVaultError } from "../../domain/auth";
import { authVaultRepository } from "../auth/localStorageVaultRepository";
import { webCryptoVaultCipher } from "../auth/webCryptoVaultCipher";
import { secretKeyHexToBytes } from "../auth/nostrKeyMaterial";
import { NostrEvent } from "../../nostr/client";

export type NostrSigner = {
  getSession: () => AuthSession;
  signEvent: (draft: Omit<NostrEvent, "id" | "pubkey" | "sig">) => Promise<NostrEvent>;
  encrypt: (recipientPubkey: string, plaintext: string) => Promise<string>;
  decrypt: (senderPubkey: string, ciphertext: string) => Promise<string | null>;
};

export function createVaultNostrSigner(
  session: AuthSession,
  passphrase: string
): NostrSigner {
  async function withSecretKey<T>(action: (secretKey: Uint8Array) => Promise<T> | T) {
    const vault = authVaultRepository.load();
    if (!vault) {
      throw new MissingVaultError();
    }

    const secretKeyHex = await webCryptoVaultCipher.decrypt(
      {
        ciphertext: vault.encryptedPrivateKey,
        iv: vault.iv,
        salt: vault.salt,
        kdfIterations: vault.kdfIterations
      },
      passphrase
    );
    const secretKey = secretKeyHexToBytes(secretKeyHex);

    try {
      return await action(secretKey);
    } finally {
      secretKey.fill(0);
    }
  }

  return {
    getSession() {
      return session;
    },
    async signEvent(draft) {
      return withSecretKey(async (secretKey) =>
        finalizeEvent(draft, secretKey) as NostrEvent
      );
    },
    async encrypt(recipientPubkey, plaintext) {
      return withSecretKey((secretKey) =>
        nip04.encrypt(secretKey, recipientPubkey, plaintext)
      );
    },
    async decrypt(senderPubkey, ciphertext) {
      return withSecretKey(async (secretKey) => {
        try {
          return await nip04.decrypt(secretKey, senderPubkey, ciphertext);
        } catch {
          return null;
        }
      });
    }
  };
}
