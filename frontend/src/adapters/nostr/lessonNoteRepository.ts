import { LessonNoteRepository } from "../../ports/lessonNoteRepository";
import { LessonNote } from "../../domain/lessonNote";
import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { getTagValue } from "../../utils/nostrTags";

export const LESSON_NOTE_TYPE = "lesson_note";

function parseLessonNoteFromEvent(
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

export function createNostrLessonNoteRepository(): LessonNoteRepository {
  return {
    subscribeNotesForLesson(lessonId, pubkey, onNote) {
      const sub = nostrClient.subscribe(
        { kinds: [TutorHubKind.StudentProgress], authors: [pubkey], limit: 100 },
        async (event) => {
          const plaintext = await nostrClient.decryptContent(
            event.pubkey,
            event.content
          );
          if (!plaintext) {
            return;
          }

          const note = parseLessonNoteFromEvent(
            event.id,
            event.created_at,
            event.pubkey,
            plaintext
          );

          if (note && note.lessonId === lessonId) {
            onNote(note);
          }
        }
      );

      return () => sub();
    },

    async publishNote(lessonId, note, recipientPubkey) {
      const payload = JSON.stringify({
        type: LESSON_NOTE_TYPE,
        lessonId,
        noteType: note.noteType,
        content: note.content,
        attachments: note.attachments,
      });

      await nostrClient.publishEncryptedEvent(
        TutorHubKind.StudentProgress,
        recipientPubkey,
        payload
      );
    },
  };
}
