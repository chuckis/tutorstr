export const AUTH_VAULT_VERSION = 1;

export type AuthSession = {
  pubkey: string;
  npub: string;
};

export type VaultRecord = {
  version: number;
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
