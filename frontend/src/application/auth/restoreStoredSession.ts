import { AuthSession, migrateVaultRecord } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";

export function restoreStoredSession(
  vaultRepository: AuthVaultRepository
): AuthSession | null {
  const stored = vaultRepository.load();
  if (!stored) {
    return null;
  }

  const migrated = migrateVaultRecord(stored);
  if (migrated.version !== stored.version || !("role" in stored)) {
    vaultRepository.save(migrated);
  }

  return {
    pubkey: migrated.pubkey,
    npub: migrated.npub,
    role: migrated.role
  };
}
