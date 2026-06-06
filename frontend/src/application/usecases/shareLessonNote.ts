import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { LessonNote, LessonNoteType } from "../../domain/lessonNote";
import { LessonNoteRepository } from "../../ports/lessonNoteRepository";

export type ShareLessonNoteInput = {
  lessonId: string;
  viewerPubkey: string;
  recipientPubkey: string;
  noteType: LessonNoteType;
  content: string;
};

export class ShareLessonNote {
  constructor(private lessonNoteRepository: LessonNoteRepository) {}

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
      attachments: [],
    };

    await this.lessonNoteRepository.publishNote(
      input.lessonId,
      note,
      input.recipientPubkey
    );
  }
}
