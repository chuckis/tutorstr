import { describe, expect, it, vi } from "vitest";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";
import { createNewProfile } from "./createNewProfile";

const FIXTURES = {
  secretKeyHex: "1111111111111111111111111111111111111111111111111111111111111111",
  pubkey: "2222222222222222222222222222222222222222222222222222222222222222",
  npub: "npub1fixture",
  nsec: "nsec1fixture"
};

function makeKeyMaterial(overrides: Partial<NostrKeyMaterial> = {}): NostrKeyMaterial {
  return {
    generateSecretKey: vi.fn().mockReturnValue(FIXTURES.secretKeyHex),
    derivePublicKey: vi.fn().mockReturnValue(FIXTURES.pubkey),
    encodeNsec: vi.fn().mockReturnValue(FIXTURES.nsec),
    encodeNpub: vi.fn().mockReturnValue(FIXTURES.npub),
    parseSecretInput: vi.fn(),
    ...overrides
  };
}

describe("createNewProfile", () => {
  it("returns a session whose role matches the requested one (tutor)", async () => {
    const keyMaterial = makeKeyMaterial();

    const result = await createNewProfile(
      { keyMaterial },
      { passphrase: "ignored", role: "tutor" }
    );

    expect(result.session).toEqual({
      pubkey: FIXTURES.pubkey,
      npub: FIXTURES.npub,
      role: "tutor",
      method: "vault",
    });
    expect(result.nsec).toBe(FIXTURES.nsec);
    expect(result.secretKeyHex).toBe(FIXTURES.secretKeyHex);
  });

  it("returns a session whose role matches the requested one (student)", async () => {
    const keyMaterial = makeKeyMaterial();

    const result = await createNewProfile(
      { keyMaterial },
      { passphrase: "ignored", role: "student" }
    );

    expect(result.session.role).toBe("student");
  });

  it("generates a fresh secret key for each call", async () => {
    const generateSecretKey = vi
      .fn()
      .mockReturnValueOnce(FIXTURES.secretKeyHex)
      .mockReturnValueOnce("3333");
    const keyMaterial = makeKeyMaterial({ generateSecretKey });

    await createNewProfile({ keyMaterial }, { passphrase: "p", role: "tutor" });
    await createNewProfile({ keyMaterial }, { passphrase: "p", role: "student" });

    expect(generateSecretKey).toHaveBeenCalledTimes(2);
    expect(keyMaterial.derivePublicKey).toHaveBeenNthCalledWith(1, FIXTURES.secretKeyHex);
    expect(keyMaterial.derivePublicKey).toHaveBeenNthCalledWith(2, "3333");
  });
});
