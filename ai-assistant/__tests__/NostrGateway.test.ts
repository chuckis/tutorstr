import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Event } from "nostr-tools";

vi.mock("../src/adapters/nostr/Crypto.js", () => ({
  decryptNip44: vi.fn(() => '{"subject":"Math HW","content":"my solution"}'),
  encryptNip44: vi.fn(() => "encrypted"),
  getBotPubkey: vi.fn(() => "bot_pubkey"),
  getConversationKey: vi.fn(() => new Uint8Array(32)),
}));

const { NostrGateway } = await import("../src/adapters/nostr/NostrGateway.js");

function makeEvent(overrides: Partial<Event> & { tags: string[][] }): Event {
  return {
    id: "abc123",
    kind: 4,
    pubkey: "student1",
    content: "encrypted_content",
    created_at: 1000,
    sig: "sig",
    ...overrides,
  } as Event;
}

describe("NostrGateway", () => {
  let gateway: NostrGateway;

  beforeEach(() => {
    vi.stubEnv("NOSTR_RELAYS", "ws://localhost:5555");
    vi.stubEnv("BOT_PRIVATE_KEY", "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab");
    gateway = new NostrGateway();
    (gateway as any).botPubkey = "bot1";
  });

  describe("processIncoming", () => {
    it("returns null for event without homework-submission tag", async () => {
      const event = makeEvent({
        tags: [["p", "bot1"], ["t", "chat"]],
      });

      const result = await (gateway as any).processIncoming(event);
      expect(result).toBeNull();
    });

    it("returns null if no tutor tag found", async () => {
      const event = makeEvent({
        tags: [["t", "homework-submission"]],
      });

      const result = await (gateway as any).processIncoming(event);
      expect(result).toBeNull();
    });

    it("returns DecryptedEvent for valid homework submission", async () => {
      const event = makeEvent({
        pubkey: "student1",
        tags: [
          ["p", "tutor1"],
          ["t", "homework-submission"],
          ["e", "root1", "", "root"],
          ["thread", "lesson:123"],
        ],
      });

      const result = await (gateway as any).processIncoming(event);

      expect(result).not.toBeNull();
      expect(result.event).toBe(event);
      expect(result.studentPubkey).toBe("student1");
      expect(result.tutorPubkey).toBe("tutor1");
      expect(result.isHomework).toBe(true);
      expect(result.rootEventId).toBe("root1");
      expect(result.isReply).toBe(false);
    });

    it("identifies reply events correctly", async () => {
      const event = makeEvent({
        pubkey: "student1",
        tags: [
          ["p", "tutor1"],
          ["p", "bot1"],
          ["t", "homework-submission"],
          ["e", "root1", "", "root"],
          ["e", "parent1", "", "reply"],
          ["e", "parent1"],
        ],
      });

      const result = await (gateway as any).processIncoming(event);

      expect(result).not.toBeNull();
      expect(result.isReply).toBe(true);
      expect(result.rootEventId).toBe("root1");
    });
  });
});
