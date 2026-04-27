import { AUTH_VAULT_VERSION, AuthSession } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { VaultCipher } from "../../ports/vaultCipher";

type ImportExistingKeyDependencies = {
  vaultRepository: AuthVaultRepository;
  vaultCipher: VaultCipher;
  keyMaterial: NostrKeyMaterial;
};

export async function importExistingKey(
  dependencies: ImportExistingKeyDependencies,
  input: { secret: string; passphrase: string }
): Promise<AuthSession> {
  const parsed = await dependencies.keyMaterial.parseSecretInput(input.secret);
  const pubkey = dependencies.keyMaterial.derivePublicKey(parsed.secretKeyHex);
  const npub = dependencies.keyMaterial.encodeNpub(pubkey);
  const encrypted = await dependencies.vaultCipher.encrypt(
    parsed.secretKeyHex,
    input.passphrase
  );

  dependencies.vaultRepository.save({
    version: AUTH_VAULT_VERSION,
    encryptedPrivateKey: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: encrypted.salt,
    kdfIterations: encrypted.kdfIterations,
    pubkey,
    npub
  });

  return { pubkey, npub };
}
