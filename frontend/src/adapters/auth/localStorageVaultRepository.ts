import { VaultRecord } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";

const VAULT_STORAGE_KEY = "tutorhub:auth-vault";

export class LocalStorageVaultRepository implements AuthVaultRepository {
  load() {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as VaultRecord;
    } catch {
      return null;
    }
  }

  save(record: VaultRecord) {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
  }

  clear() {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  }
}

export const authVaultRepository = new LocalStorageVaultRepository();
