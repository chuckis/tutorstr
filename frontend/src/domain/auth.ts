import {
  AccountRole,
  LEGACY_ACCOUNT_ROLE,
  UnsupportedAccountRoleError,
  isAccountRole
} from "./account";

export const AUTH_VAULT_VERSION = 3;

export type AuthMethod = "vault" | "nip07" | "nip46" | "nip55";

export type AuthSession = {
  pubkey: string;
  npub: string;
  role: AccountRole;
  method: AuthMethod;
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
  mnemonic?: string;
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

export class InvalidWordCountError extends AuthError {
  constructor() {
    super("auth.runtime.invalidWordCount");
  }
}

export class InvalidMnemonicChecksumError extends AuthError {
  constructor() {
    super("auth.runtime.invalidMnemonicChecksum");
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

export type V2VaultRecord = Omit<VaultRecord, "mnemonic"> & {
  version: 2;
};

function isV2VaultRecord(value: unknown): value is V2VaultRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.encryptedPrivateKey === "string" &&
    typeof r.iv === "string" &&
    typeof r.salt === "string" &&
    typeof r.kdfIterations === "number" &&
    typeof r.pubkey === "string" &&
    typeof r.npub === "string" &&
    r.version === 2
  );
}

function isLegacyVaultRecord(value: unknown): value is Omit<VaultRecord, "role" | "version" | "mnemonic"> & {
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
  if (isV2VaultRecord(raw)) {
    const { version: _v, ...rest } = raw;
    return {
      version: 2,
      role: rest.role,
      encryptedPrivateKey: rest.encryptedPrivateKey,
      iv: rest.iv,
      salt: rest.salt,
      kdfIterations: rest.kdfIterations,
      pubkey: rest.pubkey,
      npub: rest.npub
    };
  }

  if (!isLegacyVaultRecord(raw)) {
    throw new AuthError("auth.runtime.invalidVaultShape");
  }

  const { role, version: _v, ...rest } = raw;
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
    npub: rest.npub,
    mnemonic: undefined
  };
}
