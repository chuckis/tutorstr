import { useCallback } from "react";
import { useRepo } from "./RepoContext";
import { Lesson } from "../domain/lesson";
import { ShareLessonNote } from "../application/usecases/shareLessonNote";
import { AccountRole } from "../domain/account";

export type UseShareReturn = {
  shareNoteWithCounterparty: (
    lesson: Lesson,
    viewerPubkey: string,
    counterpartyPubkey: string,
    noteContent: string,
    viewerRole: AccountRole
  ) => Promise<void>;
};

export function useShare(): UseShareReturn {
  const { lessonNoteRepository } = useRepo();

  const shareLessonNoteUseCase = new ShareLessonNote(lessonNoteRepository);

  const shareNoteWithCounterparty = useCallback(
    async (
      lesson: Lesson,
      viewerPubkey: string,
      counterpartyPubkey: string,
      noteContent: string,
      viewerRole: AccountRole
    ) => {
      if (!noteContent.trim()) {
        return;
      }

      const noteType = viewerRole === "tutor" ? "tutor" : "student";

      await shareLessonNoteUseCase.execute(
        {
          lessonId: lesson.id,
          viewerPubkey,
          recipientPubkey: counterpartyPubkey,
          noteType,
          content: noteContent,
        },
        viewerRole
      );
    },
    [shareLessonNoteUseCase]
  );

  return { shareNoteWithCounterparty };
}
