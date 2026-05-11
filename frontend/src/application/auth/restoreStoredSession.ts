import { AuthSession } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";

export function restoreStoredSession(
  vaultRepository: AuthVaultRepository
): AuthSession | null {
  const vault = vaultRepository.load();
  if (!vault) {
    return null;
  }

  return {
    pubkey: vault.pubkey,
    npub: vault.npub
  };
}
