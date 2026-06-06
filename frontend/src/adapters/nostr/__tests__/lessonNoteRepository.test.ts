import { describe, expect, it } from "vitest";
import { parseLessonNoteFromEvent } from "../parseLessonNoteFromEvent";

describe("parseLessonNoteFromEvent", () => {
  const baseEvent = {
    eventId: "event-1",
    createdAt: 1715000000,
    authorPubkey: "pubkey-1",
  };

  it("parses a valid lesson note from decrypted JSON", () => {
    const plaintext = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      noteType: "tutor",
      content: "Good progress",
      attachments: [{ url: "https://example.com/file.pdf", mimeType: "application/pdf" }],
    });

    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      plaintext
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe("event-1");
    expect(result!.lessonId).toBe("lesson-1");
    expect(result!.authorPubkey).toBe("pubkey-1");
    expect(result!.createdAt).toBe(1715000000);
    expect(result!.noteType).toBe("tutor");
    expect(result!.content).toBe("Good progress");
    expect(result!.attachments).toHaveLength(1);
    expect(result!.attachments[0].url).toBe("https://example.com/file.pdf");
  });

  it("parses a student note type correctly", () => {
    const plaintext = JSON.stringify({
      type: "lesson_note",
      lessonId: "lesson-1",
      noteType: "student",
      content: "I understood",
    });

    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      plaintext
    );

    expect(result!.noteType).toBe("student");
  });

  it("returns null when the type field is not lesson_note", () => {
    const plaintext = JSON.stringify({
      type: "progress_entry",
      lessonId: "lesson-1",
      content: "Some progress data",
    });

    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      plaintext
    );

    expect(result).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      "not-json-at-all"
    );

    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      ""
    );

    expect(result).toBeNull();
  });

  it("handles missing optional fields gracefully", () => {
    const plaintext = JSON.stringify({
      type: "lesson_note",
    });

    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      plaintext
    );

    expect(result).not.toBeNull();
    expect(result!.lessonId).toBe("");
    expect(result!.noteType).toBe("tutor");
    expect(result!.content).toBe("");
    expect(result!.attachments).toEqual([]);
  });

  it("returns null when parsed value is null", () => {
    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      "null"
    );

    expect(result).toBeNull();
  });

  it("handles missing type field gracefully", () => {
    const plaintext = JSON.stringify({
      lessonId: "lesson-1",
      content: "test",
    });

    const result = parseLessonNoteFromEvent(
      baseEvent.eventId,
      baseEvent.createdAt,
      baseEvent.authorPubkey,
      plaintext
    );

    expect(result).toBeNull();
  });
});
