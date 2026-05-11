import {
  AuthSession,
  InvalidPassphraseError,
  MissingVaultError
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
  const vault = dependencies.vaultRepository.load();
  if (!vault) {
    throw new MissingVaultError();
  }

  try {
    await dependencies.vaultCipher.decrypt(
      {
        ciphertext: vault.encryptedPrivateKey,
        iv: vault.iv,
        salt: vault.salt,
        kdfIterations: vault.kdfIterations
      },
      input.passphrase
    );
  } catch {
    throw new InvalidPassphraseError();
  }

  return {
    pubkey: vault.pubkey,
    npub: vault.npub
  };
}
