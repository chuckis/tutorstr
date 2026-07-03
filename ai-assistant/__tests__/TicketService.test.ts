import { describe, it, expect, vi } from "vitest";
import { TicketStatus, type Ticket, type Message } from "../src/domain/entities/Ticket.js";
import { TicketService } from "../src/domain/services/TicketService.js";
import type { ITicketRepository } from "../src/domain/ports/ITicketRepository.js";
import type { ILLMProvider, ReviewResult } from "../src/domain/ports/ILLMProvider.js";
import type { INostrGateway, DecryptedEvent } from "../src/domain/ports/INostrGateway.js";

function createMockRepo(): ITicketRepository {
  const tickets = new Map<string, Ticket>();
  const messages: Message[] = [];

  return {
    save: vi.fn(async (t: Ticket) => { tickets.set(t.rootEventId, t); }),
    findByRootEventId: vi.fn(async (id: string) => tickets.get(id) ?? null),
    findActiveByStudent: vi.fn(),
    updateStatus: vi.fn(async (id: string, status: TicketStatus) => {
      const t = tickets.get(id);
      if (t) tickets.set(id, { ...t, status });
    }),
    updateIteration: vi.fn(),
    saveMessage: vi.fn(async (m: Message) => { messages.push(m); }),
    getMessageHistory: vi.fn(async (id: string) =>
      messages.filter((m) => m.rootEventId === id),
    ),
  };
}

function createMockLLM(result: ReviewResult): ILLMProvider {
  return { reviewHomework: vi.fn(async () => result) };
}

function createMockNostr(): INostrGateway {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribeHomeworkSubmissions: vi.fn(),
    sendEncrypted: vi.fn(async () => "event_id"),
  };
}

function makeDecryptedEvent(overrides: Partial<DecryptedEvent> = {}): DecryptedEvent {
  return {
    event: { id: "evt1", kind: 4, pubkey: "student1", tags: [], content: "", created_at: 0, sig: "sig" } as any,
    plaintext: JSON.stringify({ subject: "Math HW", content: "my solution" }),
    studentPubkey: "student1",
    tutorPubkey: "tutor1",
    isHomework: true,
    rootEventId: undefined,
    isReply: false,
    parentEventId: undefined,
    ...overrides,
  };
}

describe("TicketService", () => {
  describe("processNewSubmission", () => {
    it("creates ticket and sends feedback on NEED_FIX", async () => {
      const repo = createMockRepo();
      const llm = createMockLLM({ status: "needs_fix", feedback: "Fix line 5", suggestions: ["Check math"] });
      const nostr = createMockNostr();

      const service = new TicketService(repo, llm, nostr, 3);
      await service.processNewSubmission(makeDecryptedEvent({
        event: { id: "root1" } as any,
      }));

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(llm.reviewHomework).toHaveBeenCalledTimes(1);
      expect(nostr.sendEncrypted).toHaveBeenCalledTimes(1);

      const call = (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const payload = JSON.parse(call[0].plaintext);
      expect(payload.status).toBe("NEED_FIX");
      expect(payload.feedback).toBe("Fix line 5");

      const ticket = await repo.findByRootEventId("root1");
      expect(ticket!.status).toBe(TicketStatus.NeedFix);
    });

    it("creates ticket and escalates on APPROVED", async () => {
      const repo = createMockRepo();
      const llm = createMockLLM({ status: "approved", feedback: "All good!", suggestions: [] });
      const nostr = createMockNostr();

      const service = new TicketService(repo, llm, nostr, 3);
      await service.processNewSubmission(makeDecryptedEvent({
        event: { id: "root2" } as any,
      }));

      const call = (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const payload = JSON.parse(call[0].plaintext);
      expect(payload.type).toBe("escalation");
      expect(payload.status).toBe("APPROVED_BY_AI");
    });

    it("force escalates when max iterations is 0", async () => {
      const repo = createMockRepo();
      const llm = createMockLLM({ status: "needs_fix", feedback: "Fix it", suggestions: [] });
      const nostr = createMockNostr();

      const service = new TicketService(repo, llm, nostr, 0);
      await service.processNewSubmission(makeDecryptedEvent({
        event: { id: "root3" } as any,
      }));

      const call = (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const payload = JSON.parse(call[0].plaintext);
      expect(payload.type).toBe("escalation");
      expect(payload.status).toBe("FORCED_ESCALATION");
    });
  });

  describe("processStudentReply", () => {
    it("processes reply and sends more feedback on NEED_FIX", async () => {
      const repo = createMockRepo();
      const nostr = createMockNostr();
      const service = new TicketService(repo, createMockLLM({ status: "needs_fix", feedback: "Fix it", suggestions: [] }), nostr, 3);

      await service.processNewSubmission(makeDecryptedEvent({
        event: { id: "root4" } as any,
        rootEventId: "root4",
      }));

      (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mockClear();

      await service.processStudentReply(makeDecryptedEvent({
        event: { id: "reply1" } as any,
        rootEventId: "root4",
        isReply: true,
        parentEventId: "root4",
        plaintext: "fixed it",
      }));

      expect(repo.saveMessage).toHaveBeenCalledTimes(1);
      expect(nostr.sendEncrypted).toHaveBeenCalledTimes(1);

      const call = (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const payload = JSON.parse(call[0].plaintext);
      expect(payload.status).toBe("NEED_FIX");
    });

    it("escalates after exceeding max iterations", async () => {
      const repo = createMockRepo();
      const nostr = createMockNostr();
      const llm = createMockLLM({ status: "needs_fix", feedback: "Still wrong", suggestions: [] });
      const service = new TicketService(repo, llm, nostr, 1);

      await service.processNewSubmission(makeDecryptedEvent({
        event: { id: "root5" } as any,
        rootEventId: "root5",
      }));

      (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mockClear();

      await service.processStudentReply(makeDecryptedEvent({
        event: { id: "reply2" } as any,
        rootEventId: "root5",
        isReply: true,
        parentEventId: "root5",
        plaintext: "try 1",
      }));

      expect(nostr.sendEncrypted).toHaveBeenCalledTimes(1);
      const call = (nostr.sendEncrypted as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const payload = JSON.parse(call[0].plaintext);
      expect(payload.type).toBe("escalation");
      expect(payload.status).toBe("FORCED_ESCALATION");
    });

    it("ignores reply for non-existent ticket", async () => {
      const repo = createMockRepo();
      const nostr = createMockNostr();
      const llm = createMockLLM({ status: "approved", feedback: "ok", suggestions: [] });

      const service = new TicketService(repo, llm, nostr, 3);
      await service.processStudentReply(makeDecryptedEvent({
        rootEventId: "nonexistent",
        isReply: true,
      }));

      expect(nostr.sendEncrypted).not.toHaveBeenCalled();
    });
  });
});
