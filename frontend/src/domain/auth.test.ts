import { describe, expect, it } from "vitest";
import {
  AUTH_VAULT_VERSION,
  AuthError,
  LEGACY_VAULT_ROLE_FALLBACK,
  migrateVaultRecord
} from "./auth";

function legacyV1Record() {
  return {
    version: 1,
    encryptedPrivateKey: "ciphertext",
    iv: "iv",
    salt: "salt",
    kdfIterations: 100_000,
    pubkey: "pubkey",
    npub: "npub"
  };
}

describe("migrateVaultRecord", () => {
  it("returns v2 record as-is when role is already valid", () => {
    const stored = {
      version: AUTH_VAULT_VERSION,
      role: "student" as const,
      encryptedPrivateKey: "c",
      iv: "iv",
      salt: "s",
      kdfIterations: 1,
      pubkey: "p",
      npub: "n"
    };

    const result = migrateVaultRecord(stored);

    expect(result).toEqual(stored);
  });

  it("migrates a legacy v1 record (no role) to tutor and version 2", () => {
    const result = migrateVaultRecord(legacyV1Record());

    expect(result.role).toBe(LEGACY_VAULT_ROLE_FALLBACK);
    expect(result.version).toBe(AUTH_VAULT_VERSION);
    expect(result.pubkey).toBe("pubkey");
    expect(result.npub).toBe("npub");
  });

  it("preserves the legacy fallback constant as 'tutor'", () => {
    expect(LEGACY_VAULT_ROLE_FALLBACK).toBe("tutor");
  });

  it("throws AuthError when the stored shape is invalid", () => {
    expect(() => migrateVaultRecord(null)).toThrow(AuthError);
    expect(() => migrateVaultRecord({})).toThrow(AuthError);
    expect(() =>
      migrateVaultRecord({
        version: 1,
        encryptedPrivateKey: "c",
        iv: "iv",
        salt: "s",
        kdfIterations: 1
      })
    ).toThrow(AuthError);
  });

  it("throws UnsupportedAccountRoleError when role is an unknown string", () => {
    expect(() =>
      migrateVaultRecord({
        ...legacyV1Record(),
        role: "admin"
      })
    ).toThrow(/Unsupported account role/);
  });
});
