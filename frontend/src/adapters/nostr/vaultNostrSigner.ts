import { nip04, nip44 } from "nostr-tools";
import { finalizeEvent } from "nostr-tools/pure";
import { AuthSession, MissingVaultError } from "../../domain/auth";
import { authVaultRepository } from "../auth/localStorageVaultRepository";
import { webCryptoVaultCipher } from "../auth/webCryptoVaultCipher";
import { secretKeyHexToBytes } from "../auth/nostrKeyMaterial";
import { NostrSigner, SignedEvent } from "../../ports/nostrSigner";

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
        finalizeEvent(draft, secretKey) as SignedEvent
      );
    },
    async encrypt(recipientPubkey, plaintext) {
      return withSecretKey((secretKey) => {
        const conversationKey = nip44.v2.utils.getConversationKey(secretKey, recipientPubkey);
        return nip44.v2.encrypt(plaintext, conversationKey);
      });
    },
    async decrypt(senderPubkey, ciphertext) {
      return withSecretKey(async (secretKey) => {
        const conversationKey = nip44.v2.utils.getConversationKey(secretKey, senderPubkey);
        try {
          return await nip44.v2.decrypt(ciphertext, conversationKey);
        } catch {
          try {
            return await nip04.decrypt(secretKey, senderPubkey, ciphertext);
          } catch {
            return null;
          }
        }
      });
    }
  };
}