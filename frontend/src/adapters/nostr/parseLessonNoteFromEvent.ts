import { LessonNote } from "../../domain/lessonNote";

export const LESSON_NOTE_TYPE = "lesson_note";

export function parseLessonNoteFromEvent(
  eventId: string,
  createdAt: number,
  authorPubkey: string,
  plaintext: string
): LessonNote | null {
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed?.type !== LESSON_NOTE_TYPE) {
      return null;
    }

    return {
      id: eventId,
      lessonId: parsed.lessonId || "",
      authorPubkey,
      createdAt,
      noteType: parsed.noteType || "tutor",
      content: parsed.content || "",
      attachments: parsed.attachments || [],
    };
  } catch {
    return null;
  }
}
