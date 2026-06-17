import { AuthSession, migrateVaultRecord } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { restoreNip07Session } from "./saveNip07Session";
import { Nip46Signer } from "../../adapters/nostr/nip46Signer";

export function restoreStoredSession(
  vaultRepository: AuthVaultRepository
): AuthSession | null {
  const stored = vaultRepository.load();
  if (!stored) {
    // No vault — try NIP-07 persisted session
    const nip07 = restoreNip07Session();
    if (nip07) return nip07;

    // Try NIP-46 persisted session
    const nip46 = Nip46Signer.getPersistedSessionData();
    if (nip46) {
      return {
        pubkey: nip46.userPubkey,
        npub: Nip46Signer.restoreFromStorage()?.getSession()?.npub ?? nip46.userPubkey,
        role: "tutor",
        method: "nip46",
      };
    }

    return null;
  }

  const migrated = migrateVaultRecord(stored);
  if (migrated.version !== stored.version || !("role" in stored)) {
    vaultRepository.save(migrated);
  }

  return {
    pubkey: migrated.pubkey,
    npub: migrated.npub,
    role: migrated.role,
    method: "vault",
  };
}

/**
 * Tries to restore a NIP-46 signer from a persisted session.
 * The signer needs to be re-connected (subscription re-established)
 * but remains usable once connected.
 */
export function restoreNip46Signer(): Nip46Signer | null {
  return Nip46Signer.restoreFromStorage();
}
