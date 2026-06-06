import { LessonNote } from "../domain/lessonNote";

export interface LessonNoteRepository {
  subscribeNotesForLesson(
    lessonId: string,
    pubkey: string,
    onNote: (note: LessonNote) => void,
    onReady?: () => void
  ): () => void;
  publishNote(
    lessonId: string,
    note: LessonNote,
    recipientPubkey: string
  ): Promise<void>;
}
