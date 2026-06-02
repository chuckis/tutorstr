import {
  AuthSession,
  InvalidPassphraseError,
  MissingVaultError,
  migrateVaultRecord
} from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { VaultCipher } from "../../ports/vaultCipher";

type UnlockVaultDependencies = {
  vaultRepository: AuthVaultRepository;
  vaultCipher: VaultCipher;
};

export async function unlockVault(
  dependencies: UnlockVaultDependencies,
  input: { passphrase: string }
): Promise<AuthSession> {
  const stored = dependencies.vaultRepository.load();
  if (!stored) {
    throw new MissingVaultError();
  }

  try {
    await dependencies.vaultCipher.decrypt(
      {
        ciphertext: stored.encryptedPrivateKey,
        iv: stored.iv,
        salt: stored.salt,
        kdfIterations: stored.kdfIterations
      },
      input.passphrase
    );
  } catch {
    throw new InvalidPassphraseError();
  }

  const vault = migrateVaultRecord(stored);
  if (vault.version !== stored.version || !("role" in stored)) {
    dependencies.vaultRepository.save(vault);
  }

  return {
    pubkey: vault.pubkey,
    npub: vault.npub,
    role: vault.role
  };
}
