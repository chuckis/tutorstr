import { MissingVaultError } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { VaultCipher } from "../../ports/vaultCipher";

type ExportSecretKeyDependencies = {
  vaultRepository: AuthVaultRepository;
  vaultCipher: VaultCipher;
  keyMaterial: NostrKeyMaterial;
};

export async function exportSecretKey(
  dependencies: ExportSecretKeyDependencies,
  input: { passphrase: string }
): Promise<string> {
  const vault = dependencies.vaultRepository.load();
  if (!vault) {
    throw new MissingVaultError();
  }

  const secretKeyHex = await dependencies.vaultCipher.decrypt(
    {
      ciphertext: vault.encryptedPrivateKey,
      iv: vault.iv,
      salt: vault.salt,
      kdfIterations: vault.kdfIterations
    },
    input.passphrase
  );

  return dependencies.keyMaterial.encodeNsec(secretKeyHex);
}
