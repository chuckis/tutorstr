import { describe, expect, it, vi } from "vitest";
import { VaultRecord } from "../../domain/auth";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { restoreStoredSession } from "./restoreStoredSession";

function makeRepo(stored: unknown): AuthVaultRepository {
  return {
    load: vi.fn().mockReturnValue(stored),
    save: vi.fn(),
    clear: vi.fn()
  };
}

function legacyV1() {
  return {
    version: 1,
    encryptedPrivateKey: "ct",
    iv: "iv",
    salt: "salt",
    kdfIterations: 100_000,
    pubkey: "pubkey",
    npub: "npub"
  };
}

function v2Record(overrides: Partial<VaultRecord> = {}): VaultRecord {
  return {
    version: 2,
    role: "tutor",
    encryptedPrivateKey: "ct",
    iv: "iv",
    salt: "salt",
    kdfIterations: 100_000,
    pubkey: "pubkey",
    npub: "npub",
    ...overrides
  };
}

describe("restoreStoredSession", () => {
  it("returns null when the vault is empty", () => {
    const repo = makeRepo(null);

    expect(restoreStoredSession(repo)).toBeNull();
  });

  it("returns a session with the v2 role without re-saving when nothing changed", () => {
    const stored = v2Record({ role: "student" });
    const repo = makeRepo(stored);
    const saveSpy = vi.mocked(repo.save);

    const session = restoreStoredSession(repo);

    expect(session).toEqual({
      pubkey: "pubkey",
      npub: "npub",
      role: "student",
      method: "vault"
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("migrates a legacy v1 vault to v2 with role=tutor and persists it", () => {
    const stored = legacyV1();
    const repo = makeRepo(stored);
    const saveSpy = vi.mocked(repo.save);

    const session = restoreStoredSession(repo);

    expect(session?.role).toBe("tutor");
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tutor", version: 2 })
    );
  });

  it("returns a session even when the stored shape is invalid (by re-throwing via the caller)", () => {
    const repo = makeRepo({});

    expect(() => restoreStoredSession(repo)).toThrow();
  });
});
