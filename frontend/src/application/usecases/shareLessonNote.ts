import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { LessonNote, LessonNoteType } from "../../domain/lessonNote";
import { LessonNoteRepository } from "../../ports/lessonNoteRepository";
import { MessageAttachment } from "../../domain/messaging";

export type ShareLessonNoteInput = {
  lessonId: string;
  viewerPubkey: string;
  recipientPubkey: string;
  noteType: LessonNoteType;
  content: string;
  attachments?: MessageAttachment[];
};

export class ShareLessonNote {
  constructor(
    private lessonNoteRepository: LessonNoteRepository,
    private onOptimisticUpdate?: (lessonId: string, note: LessonNote) => void,
    private onRollback?: (lessonId: string, noteId: string) => void,
  ) {}

  async execute(input: ShareLessonNoteInput, viewerRole: AccountRole): Promise<void> {
    const expectedRole = input.noteType === "tutor" ? "tutor" : "student";
    assertRole(viewerRole, expectedRole);

    const note: LessonNote = {
      id: `${input.lessonId}:${input.viewerPubkey}:${Date.now()}:shared`,
      lessonId: input.lessonId,
      authorPubkey: input.viewerPubkey,
      createdAt: Math.floor(Date.now() / 1000),
      noteType: input.noteType,
      content: input.content,
      attachments: input.attachments ?? [],
    };

    this.onOptimisticUpdate?.(input.lessonId, note);
    try {
      await this.lessonNoteRepository.publishNote(
        input.lessonId,
        note,
        input.recipientPubkey
      );
    } catch (error) {
      this.onRollback?.(input.lessonId, note.id);
      throw error;
    }
  }
}
