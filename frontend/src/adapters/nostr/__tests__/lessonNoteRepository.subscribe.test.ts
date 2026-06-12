import { describe, beforeEach, afterEach, expect, it, vi } from "vitest";
import { createNostrLessonNoteRepository } from "../lessonNoteRepository";
import { emitEvent, clearEventBus } from "../eventBus";
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
    tags: [["p", "pubkey-test"]],
    content: "encrypted",
    sig: "sig",
    ...overrides,
  };
}

describe("createNostrLessonNoteRepository subscribe", () => {
  beforeEach(() => {
    clearEventBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("delivers decrypted notes matching lessonId", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      noteType: "tutor",
      content: "Great lesson",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote);

    emitEvent(makeEvent({ id: "event-1", pubkey: "tutor-1" }));

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

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-other",
      content: "Wrong lesson",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote);

    emitEvent(makeEvent({ id: "event-2", pubkey: "tutor-1" }));

    await vi.waitFor(() => {
      expect(nostrClient.decryptContent).toHaveBeenCalled();
    });

    expect(onNote).not.toHaveBeenCalled();
  });

  it("deduplicates events with the same id", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      content: "Shared note",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote);

    // Emit the same event twice — eventBus deduplicates by id
    emitEvent(makeEvent({ id: "event-shared" }));
    emitEvent(makeEvent({ id: "event-shared" }));

    // Wait for decrypt to settle
    await vi.waitFor(() => {
      expect(onNote).toHaveBeenCalledOnce();
    });
  });

  it("ignores malformed (non-lesson_note) events", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();

    const malformedPayload = JSON.stringify({
      type: "progress_entry",
      topic: "Math",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(malformedPayload);

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote);

    emitEvent(makeEvent({ id: "event-progress", pubkey: "tutor-1" }));

    await vi.waitFor(() => {
      expect(nostrClient.decryptContent).toHaveBeenCalled();
    });

    expect(onNote).not.toHaveBeenCalled();
  });

  it("filters out events not addressed to or authored by the user", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(
      JSON.stringify({ type: "lesson_note", lessonId: "lesson-1", content: "ok" }),
    );

    repo.subscribeNotesForLesson("lesson-1", "pubkey-test", onNote);

    // Not addressed to pubkey-test, not authored by pubkey-test
    emitEvent(
      makeEvent({
        id: "event-unrelated",
        tags: [["p", "someone-else"]],
      }),
    );

    // Give async decrypt time to settle
    await vi.waitFor(() => {
      expect(nostrClient.decryptContent).not.toHaveBeenCalled();
    });

    expect(onNote).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function that stops delivery", async () => {
    const repo = createNostrLessonNoteRepository();
    const onNote = vi.fn();

    const eventPayload = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      content: "After unsubscribe",
    });

    vi.mocked(nostrClient.decryptContent).mockResolvedValue(eventPayload);

    const unsubscribe = repo.subscribeNotesForLesson(
      "lesson-1",
      "pubkey-test",
      onNote,
    );

    unsubscribe();

    emitEvent(makeEvent({ id: "event-after" }));

    // Small delay to ensure the event wasn't delivered
    await vi.waitFor(() => {
      expect(onNote).not.toHaveBeenCalled();
    });
  });
});
