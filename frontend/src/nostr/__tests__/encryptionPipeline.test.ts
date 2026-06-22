import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config", () => ({
  DEFAULT_RELAYS: ["wss://relay.test"],
}));

import { generateSecretKey, getPublicKey, nip44, nip04 } from "nostr-tools";
import { finalizeEvent } from "nostr-tools/pure";
import { nostrClient } from "../client";
import { createNostrLessonNoteRepository } from "../../adapters/nostr/lessonNoteRepository";
import { clearEventBus } from "../../adapters/nostr/eventBus";
import type { NostrSigner, SignedEvent, SignEventDraft } from "../../ports/nostrSigner";
import type { AuthSession } from "../../domain/auth";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

class Nip44TestSigner implements NostrSigner {
  private secretKey: Uint8Array;
  publicKey: string;

  constructor(secretKeyHex?: string) {
    if (secretKeyHex) {
      this.secretKey = hexToBytes(secretKeyHex);
    } else {
      this.secretKey = generateSecretKey();
    }
    this.publicKey = getPublicKey(this.secretKey);
  }

  getSession(): AuthSession {
    return {
      pubkey: this.publicKey,
      npub: `npub1test${this.publicKey.slice(0, 8)}`,
      role: "tutor",
      method: "vault",
    };
  }

  async encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.secretKey,
      recipientPubkey,
    );
    return nip44.v2.encrypt(plaintext, conversationKey);
  }

  async decrypt(
    senderPubkey: string,
    ciphertext: string,
  ): Promise<string | null> {
    const conversationKey = nip44.v2.utils.getConversationKey(
      this.secretKey,
      senderPubkey,
    );
    try {
      return nip44.v2.decrypt(ciphertext, conversationKey);
    } catch {
      try {
        return nip04.decrypt(
          bytesToHex(this.secretKey),
          senderPubkey,
          ciphertext,
        );
      } catch {
        return null;
      }
    }
  }

  async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
    return finalizeEvent(draft, this.secretKey) as unknown as SignedEvent;
  }
}

describe("Encryption pipeline", () => {
  beforeEach(() => {
    clearEventBus();
  });

  afterEach(() => {
    nostrClient.setSigner(null);
    vi.restoreAllMocks();
  });

  describe("encryptContent / decryptContent round-trip", () => {
    it("encrypts plaintext and decrypts back to original", async () => {
      const alice = new Nip44TestSigner();
      const bob = new Nip44TestSigner();
      const message = "Hello, encrypted world!";

      nostrClient.setSigner(alice);
      const ciphertext = await nostrClient.encryptContent(
        bob.publicKey,
        message,
      );

      expect(ciphertext).not.toBe(message);
      expect(typeof ciphertext).toBe("string");
      expect(ciphertext.length).toBeGreaterThan(0);

      nostrClient.setSigner(bob);
      const decrypted = await nostrClient.decryptContent(
        alice.publicKey,
        ciphertext,
      );
      expect(decrypted).toBe(message);
    });

    it("returns null when decrypting with wrong key", async () => {
      const alice = new Nip44TestSigner();
      const bob = new Nip44TestSigner();
      const charlie = new Nip44TestSigner();
      const message = "Secret message";

      nostrClient.setSigner(alice);
      const ciphertext = await nostrClient.encryptContent(
        bob.publicKey,
        message,
      );

      nostrClient.setSigner(charlie);
      const result = await nostrClient.decryptContent(
        alice.publicKey,
        ciphertext,
      );
      expect(result).toBeNull();
    });
  });

  describe("publishEncryptedEvent", () => {
    it("publishes encrypted content with correct tags", async () => {
      const publishSpy = vi
        .spyOn(nostrClient, "publish")
        .mockResolvedValue(undefined);
      const alice = new Nip44TestSigner();
      const bob = new Nip44TestSigner();
      const secret = "This is a secret lesson note";

      nostrClient.setSigner(alice);
      await nostrClient.publishEncryptedEvent(
        30004,
        bob.publicKey,
        secret,
        [["t", "lesson_note"]],
      );

      expect(publishSpy).toHaveBeenCalledOnce();
      const event = publishSpy.mock.calls[0][0];

      expect(event.content).not.toBe(secret);
      expect(event.tags).toContainEqual(["p", bob.publicKey]);
      expect(event.tags).toContainEqual(["t", "lesson_note"]);
      expect(event.kind).toBe(30004);
    });

    it("can be decrypted by the intended recipient", async () => {
      const publishSpy = vi
        .spyOn(nostrClient, "publish")
        .mockResolvedValue(undefined);
      const alice = new Nip44TestSigner();
      const bob = new Nip44TestSigner();
      const secret = "For Bob's eyes only";

      nostrClient.setSigner(alice);
      await nostrClient.publishEncryptedEvent(30004, bob.publicKey, secret);

      const event = publishSpy.mock.calls[0][0];

      nostrClient.setSigner(bob);
      const decrypted = await nostrClient.decryptContent(
        alice.publicKey,
        event.content,
      );
      expect(decrypted).toBe(secret);
    });
  });

  describe("lessonNoteRepository.publishNote integration", () => {
    it("encrypts a note published to a recipient so only they can read it", async () => {
      const publishSpy = vi
        .spyOn(nostrClient, "publish")
        .mockResolvedValue(undefined);
      const tutor = new Nip44TestSigner();
      const student = new Nip44TestSigner();

      nostrClient.setSigner(tutor);
      const repo = createNostrLessonNoteRepository();

      const note = {
        id: "note-1",
        lessonId: "lesson-1",
        authorPubkey: tutor.publicKey,
        createdAt: Math.floor(Date.now() / 1000),
        noteType: "tutor" as const,
        content: "Good progress on algebra",
        attachments: [] as [],
      };

      await repo.publishNote("lesson-1", note, student.publicKey);

      expect(publishSpy).toHaveBeenCalledOnce();
      const event = publishSpy.mock.calls[0][0];
      expect(event.kind).toBe(30004);
      expect(event.tags).toContainEqual(["p", student.publicKey]);

      const originalPayload = JSON.stringify({
        type: "lesson_note",
        lessonId: "lesson-1",
        noteType: "tutor",
        content: "Good progress on algebra",
        attachments: [],
      });
      expect(event.content).not.toBe(originalPayload);

      nostrClient.setSigner(student);
      const decrypted = await nostrClient.decryptContent(
        tutor.publicKey,
        event.content,
      );
      expect(decrypted).toContain("lesson_note");
      expect(decrypted).toContain("lesson-1");
      expect(decrypted).toContain("algebra");
    });

    it("encrypts a note published to self for cloud backup", async () => {
      const publishSpy = vi
        .spyOn(nostrClient, "publish")
        .mockResolvedValue(undefined);
      const tutor = new Nip44TestSigner();

      nostrClient.setSigner(tutor);
      const repo = createNostrLessonNoteRepository();

      const note = {
        id: "note-2",
        lessonId: "lesson-1",
        authorPubkey: tutor.publicKey,
        createdAt: Math.floor(Date.now() / 1000),
        noteType: "tutor" as const,
        content: "Private reflection",
        attachments: [] as [],
      };

      await repo.publishNote("lesson-1", note, tutor.publicKey);

      const event = publishSpy.mock.calls[0][0];
      expect(event.tags).toContainEqual(["p", tutor.publicKey]);

      const decrypted = await nostrClient.decryptContent(
        tutor.publicKey,
        event.content,
      );
      expect(decrypted).toContain("lesson_note");
      expect(decrypted).toContain("Private reflection");
    });
  });

  describe("NIP-04 fallback", () => {
    it("decrypts NIP-04 ciphertext when NIP-44 fails", async () => {
      const hexKey = bytesToHex(generateSecretKey());
      const bob = new Nip44TestSigner();
      const message = "Legacy encrypted message";

      const nip04Ciphertext = await nip04.encrypt(
        hexKey,
        bob.publicKey,
        message,
      );

      const alice = new Nip44TestSigner(hexKey);

      nostrClient.setSigner(alice);
      const decrypted = await nostrClient.decryptContent(
        bob.publicKey,
        nip04Ciphertext,
      );
      expect(decrypted).toBe(message);
    });
  });
});
