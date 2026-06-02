import { describe, expect, it, vi } from "vitest";
import { ParsedSecretInput } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";
import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { VaultCipher } from "../../ports/vaultCipher";
import { importExistingKey } from "./importExistingKey";

const FIXTURES = {
  secretKeyHex: "1111111111111111111111111111111111111111111111111111111111111111",
  pubkey: "2222222222222222222222222222222222222222222222222222222222222222",
  npub: "npub1fixture"
};

function makeDeps(overrides: Partial<{
  keyMaterial: NostrKeyMaterial;
  vaultCipher: VaultCipher;
  vaultRepository: AuthVaultRepository;
}> = {}) {
  const parsed: ParsedSecretInput = {
    format: "nsec",
    secretKeyHex: FIXTURES.secretKeyHex
  };
  const keyMaterial: NostrKeyMaterial = {
    generateSecretKey: vi.fn(),
    derivePublicKey: vi.fn().mockReturnValue(FIXTURES.pubkey),
    encodeNsec: vi.fn(),
    encodeNpub: vi.fn().mockReturnValue(FIXTURES.npub),
    parseSecretInput: vi.fn().mockResolvedValue(parsed),
    ...overrides.keyMaterial
  };
  const vaultCipher: VaultCipher = {
    encrypt: vi.fn().mockResolvedValue({
      ciphertext: "ct",
      iv: "iv",
      salt: "salt",
      kdfIterations: 1
    }),
    decrypt: vi.fn(),
    ...overrides.vaultCipher
  };
  const vaultRepository: AuthVaultRepository = {
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
    ...overrides.vaultRepository
  };

  return { keyMaterial, vaultCipher, vaultRepository };
}

describe("importExistingKey", () => {
  it("defaults to tutor when role is not provided", async () => {
    const { keyMaterial, vaultCipher, vaultRepository } = makeDeps();
    const saveSpy = vi.mocked(vaultRepository.save);

    const session = await importExistingKey(
      { keyMaterial, vaultCipher, vaultRepository },
      { secret: "nsec1abc", passphrase: "pass" }
    );

    expect(session.role).toBe("tutor");
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tutor", version: 2 })
    );
  });

  it("persists the explicit role when provided (student)", async () => {
    const { keyMaterial, vaultCipher, vaultRepository } = makeDeps();
    const saveSpy = vi.mocked(vaultRepository.save);

    const session = await importExistingKey(
      { keyMaterial, vaultCipher, vaultRepository },
      { secret: "nsec1abc", passphrase: "pass", role: "student" }
    );

    expect(session.role).toBe("student");
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student" })
    );
  });

  it("encrypts the secret key under the provided passphrase", async () => {
    const { keyMaterial, vaultCipher, vaultRepository } = makeDeps();
    const encryptSpy = vi.mocked(vaultCipher.encrypt);

    await importExistingKey(
      { keyMaterial, vaultCipher, vaultRepository },
      { secret: "nsec1abc", passphrase: "correct horse battery staple" }
    );

    expect(encryptSpy).toHaveBeenCalledWith(
      FIXTURES.secretKeyHex,
      "correct horse battery staple"
    );
  });
});
