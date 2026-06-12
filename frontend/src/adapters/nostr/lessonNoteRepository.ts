import { LessonNoteRepository } from "../../ports/lessonNoteRepository";
import { LessonNote } from "../../domain/lessonNote";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";
import { TutorHubKind } from "../../nostr/kinds";
import { getTagValue } from "../../utils/nostrTags";
import { parseLessonNoteFromEvent, LESSON_NOTE_TYPE } from "./parseLessonNoteFromEvent";

export { parseLessonNoteFromEvent, LESSON_NOTE_TYPE };

export function createNostrLessonNoteRepository(): LessonNoteRepository {
  return {
    subscribeNotesForLesson(lessonId, pubkey, onNote) {
      return addKindListener(TutorHubKind.StudentProgress, async (event) => {
        const isIncoming = getTagValue(event.tags, "p") === pubkey;
        const isOutgoing = event.pubkey === pubkey;
        if (!isIncoming && !isOutgoing) return;

        const plaintext = await nostrClient.decryptContent(
          event.pubkey,
          event.content,
        );
        if (!plaintext) return;

        const note = parseLessonNoteFromEvent(
          event.id,
          event.created_at,
          event.pubkey,
          plaintext,
        );

        if (note && note.lessonId === lessonId) {
          onNote(note);
        }
      });
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
        payload,
      );
    },
  };
}
