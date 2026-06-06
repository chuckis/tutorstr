import { describe, afterEach, expect, it, vi } from "vitest";
import { createNostrLessonNoteRepository } from "../lessonNoteRepository";
import { nostrClient } from "../../../nostr/client";
import type { NostrEvent } from "../../../nostr/client";

vi.mock("../../../nostr/client", () => {
  const mockDecryptContent = vi.fn();
  const mockSubscribe = vi.fn();
  const mockPublishEncryptedEvent = vi.fn().mockResolvedValue(undefined);

  return {
    nostrClient: {
      decryptContent: mockDecryptContent,
      subscribe: mockSubscribe,
      publishEncryptedEvent: mockPublishEncryptedEvent,
    },
    NostrClient: vi.fn(),
  };
});

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: "evt-1",
    pubkey: "author-1",
    created_at: 1715000000,
    kind: 30004,
    tags: [],
    content: "encrypted",
    sig: "sig",
    ...overrides,
  };
}

describe("createNostrLessonNoteRepository subscribe", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates two subscriptions: one by #p and one by authors", () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    vi.mocked(nostrClient.subscribe)
      .mockReturnValueOnce(() => {})
      .mockReturnValueOnce(() => {});

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    expect(nostrClient.subscribe).toHaveBeenCalledTimes(2);

    const [filter1] = vi.mocked(nostrClient.subscribe).mock.calls[0];
    expect(filter1.kinds).toEqual([30004]);
    expect((filter1 as Record<string, string[]>)["#p"]).toEqual(["pubkey-test"]);

    const [filter2] = vi.mocked(nostrClient.subscribe).mock.calls[1];
    expect(filter2.kinds).toEqual([30004]);
    expect((filter2 as Record<string, string[]>).authors).toEqual(["pubkey-test"]);
  });

  it("fires onReady only after both subscriptions EOSE", () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    let eose1: (() => void) | undefined;
    let eose2: (() => void) | undefined;

    vi.mocked(nostrClient.subscribe).mockImplementation((_filter, _onEvent, options) => {
      if (!eose1) {
        eose1 = options?.onEose;
      } else {
        eose2 = options?.onEose;
      }
      return () => {};
    });

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    expect(onReady).not.toHaveBeenCalled();

    eose1!();
    expect(onReady).not.toHaveBeenCalled();

    eose2!();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("forwards decrypted events matching the lessonId to onNote", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      noteType: "tutor",
      content: "Great lesson",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);
    vi.mocked(nostrClient.subscribe).mockImplementation((_filter, onEvent, options) => {
      setImmediate(() => {
        onEvent(makeEvent({ id: "event-1", pubkey: "tutor-1" }));
        setImmediate(() => options?.onEose?.());
      });
      return () => {};
    });

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    await vi.waitFor(() => {
      expect(onNote).toHaveBeenCalledOnce();
    });

    const note = onNote.mock.calls[0][0];
    expect(note.lessonId).toBe("lesson-1");
    expect(note.content).toBe("Great lesson");
    expect(note.authorPubkey).toBe("tutor-1");
  });

  it("ignores events with a different lessonId", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-other",
      content: "Wrong lesson",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);
    vi.mocked(nostrClient.subscribe).mockImplementation((_filter, onEvent, options) => {
      setImmediate(() => {
        onEvent(makeEvent({ id: "event-2", pubkey: "tutor-1" }));
        setImmediate(() => options?.onEose?.());
      });
      return () => {};
    });

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    await vi.waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });

    expect(onNote).not.toHaveBeenCalled();
  });

  it("deduplicates the same event when both subscriptions fire it", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      content: "Shared note",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);
    vi.mocked(nostrClient.subscribe).mockImplementation((_filter, onEvent, options) => {
      const evt = makeEvent({ id: "event-shared" });
      setImmediate(() => {
        onEvent(evt);
        setImmediate(() => options?.onEose?.());
      });
      return () => {};
    });

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    await vi.waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });

    // Even though both subscriptions fire the same event id,
    // the handleEvent's shared seen set should deduplicate.
    expect(onNote).toHaveBeenCalledOnce();
  });

  it("ignores malformed (non-lesson_note) events", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();
    const onReady = vi.fn();

    const malformedPayload = JSON.stringify({
      type: "progress_entry",
      topic: "Math",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(malformedPayload);
    vi.mocked(nostrClient.subscribe).mockImplementation((_filter, onEvent, options) => {
      setImmediate(() => {
        onEvent(makeEvent({ id: "event-progress", pubkey: "tutor-1" }));
        setImmediate(() => options?.onEose?.());
      });
      return () => {};
    });

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote, onReady);

    await vi.waitFor(() => {
      expect(onReady).toHaveBeenCalledOnce();
    });

    expect(onNote).not.toHaveBeenCalled();
  });

  it("returns a combined unsubscribe function that closes both subscriptions", () => {
    const repo = createNostrLessonNoteRepository();
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();

    vi.mocked(nostrClient.subscribe)
      .mockReturnValueOnce(unsub1)
      .mockReturnValueOnce(unsub2);

    const unsubscribe = repo.subscribeNotesForLesson("lesson-1", "pubkey-test", vi.fn());

    unsubscribe();

    expect(unsub1).toHaveBeenCalledOnce();
    expect(unsub2).toHaveBeenCalledOnce();
  });
});
