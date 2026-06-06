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
