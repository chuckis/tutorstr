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
    super("Invalid key format. Please try again.");
  }
}

export class InvalidPassphraseError extends AuthError {
  constructor() {
    super("Incorrect master password.");
  }
}

export class MissingVaultError extends AuthError {
  constructor() {
    super("No saved profile found on this device.");
  }
}
