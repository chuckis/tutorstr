import { MessageAttachment } from "./messaging";

export type LessonNoteType = "tutor" | "student";

export type LessonNote = {
  id: string;
  lessonId: string;
  authorPubkey: string;
  createdAt: number;
  noteType: LessonNoteType;
  content: string;
  attachments: MessageAttachment[];
};

export type NoteVisibility = "saved" | "published" | "shared";

export type LessonNoteWithVisibility = LessonNote & {
  visibility: NoteVisibility[];
};
