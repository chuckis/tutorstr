import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { LessonNote, LessonNoteType } from "../../domain/lessonNote";
import { LessonNoteRepository } from "../../ports/lessonNoteRepository";

export type SendLessonNoteInput = {
  lessonId: string;
  viewerPubkey: string;
  noteType: LessonNoteType;
  content: string;
};

export class SendLessonNote {
  constructor(private lessonNoteRepository: LessonNoteRepository) {}

  async execute(input: SendLessonNoteInput, viewerRole: AccountRole): Promise<void> {
    assertRole(viewerRole, input.noteType === "tutor" ? "tutor" : "student");

    const note: LessonNote = {
      id: `${input.lessonId}:${input.viewerPubkey}:${Date.now()}`,
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
      input.viewerPubkey
    );
  }
}
