import { LessonNoteRepository } from "../../ports/lessonNoteRepository";
import { LessonNote } from "../../domain/lessonNote";
import { nostrClient, NostrEvent } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { parseLessonNoteFromEvent, LESSON_NOTE_TYPE } from "./parseLessonNoteFromEvent";

export { parseLessonNoteFromEvent, LESSON_NOTE_TYPE };

export function createNostrLessonNoteRepository(): LessonNoteRepository {
  return {
    subscribeNotesForLesson(lessonId, pubkey, onNote, onReady) {
      const seen = new Set<string>();
      let incomingReady = false;
      let ownBackupReady = false;
      let readyNotified = false;

      const notifyReady = () => {
        if (readyNotified || !incomingReady || !ownBackupReady) {
          return;
        }
        readyNotified = true;
        onReady?.();
      };

      const handleEvent = async (event: NostrEvent) => {
        if (seen.has(event.id)) {
          return;
        }

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
          seen.add(event.id);
          onNote(note);
        }
      };

      const incoming = nostrClient.subscribe(
        { kinds: [TutorHubKind.StudentProgress], "#p": [pubkey], limit: 100 },
        handleEvent,
        {
          onEose: () => {
            incomingReady = true;
            notifyReady();
          },
        }
      );

      const ownBackup = nostrClient.subscribe(
        { kinds: [TutorHubKind.StudentProgress], authors: [pubkey], limit: 100 },
        handleEvent,
        {
          onEose: () => {
            ownBackupReady = true;
            notifyReady();
          },
        }
      );

      return () => {
        incoming();
        ownBackup();
      };
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
