import { AUTH_VAULT_VERSION } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { VaultCipher } from "../../ports/vaultCipher";

type SaveGeneratedProfileDependencies = {
  vaultRepository: AuthVaultRepository;
  vaultCipher: VaultCipher;
};

export async function saveGeneratedProfile(
  dependencies: SaveGeneratedProfileDependencies,
  input: {
    secretKeyHex: string;
    passphrase: string;
    pubkey: string;
    npub: string;
  }
) {
  const encrypted = await dependencies.vaultCipher.encrypt(
    input.secretKeyHex,
    input.passphrase
  );

  dependencies.vaultRepository.save({
    version: AUTH_VAULT_VERSION,
    encryptedPrivateKey: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: encrypted.salt,
    kdfIterations: encrypted.kdfIterations,
    pubkey: input.pubkey,
    npub: input.npub
  });
}
