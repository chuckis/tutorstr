import {
  AccountRole,
  LEGACY_ACCOUNT_ROLE,
  UnsupportedAccountRoleError,
  isAccountRole
} from "./account";

export const AUTH_VAULT_VERSION = 2;

export type AuthSession = {
  pubkey: string;
  npub: string;
  role: AccountRole;
};

export type VaultRecord = {
  version: number;
  role: AccountRole;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  kdfIterations: number;
  pubkey: string;
  npub: string;
};

export type ParsedSecretInput = {
  format: "nsec" | "hex" | "seed";
  secretKeyHex: string;
};

export class AuthError extends Error {}

export class InvalidSecretInputError extends AuthError {
  constructor() {
    super("auth.runtime.invalidSecretInput");
  }
}

export class InvalidPassphraseError extends AuthError {
  constructor() {
    super("auth.runtime.invalidPassphrase");
  }
}

export class MissingVaultError extends AuthError {
  constructor() {
    super("auth.runtime.missingVault");
  }
}

export const LEGACY_VAULT_ROLE_FALLBACK: AccountRole = LEGACY_ACCOUNT_ROLE;

export function isLegacyVaultRecord(value: unknown): value is Omit<VaultRecord, "role" | "version"> & {
  version?: number;
  role?: unknown;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.encryptedPrivateKey === "string" &&
    typeof record.iv === "string" &&
    typeof record.salt === "string" &&
    typeof record.kdfIterations === "number" &&
    typeof record.pubkey === "string" &&
    typeof record.npub === "string"
  );
}

export function migrateVaultRecord(raw: unknown): VaultRecord {
  if (!isLegacyVaultRecord(raw)) {
    throw new AuthError("auth.runtime.invalidVaultShape");
  }

  const { role, version, ...rest } = raw;
  let resolvedRole: AccountRole;

  if (role === undefined || role === null) {
    resolvedRole = LEGACY_VAULT_ROLE_FALLBACK;
  } else if (typeof role === "string" && isAccountRole(role)) {
    resolvedRole = role;
  } else {
    throw new UnsupportedAccountRoleError(String(role));
  }

  return {
    version: AUTH_VAULT_VERSION,
    role: resolvedRole,
    encryptedPrivateKey: rest.encryptedPrivateKey,
    iv: rest.iv,
    salt: rest.salt,
    kdfIterations: rest.kdfIterations,
    pubkey: rest.pubkey,
    npub: rest.npub
  };
}
