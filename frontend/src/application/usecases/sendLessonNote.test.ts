import { describe, expect, it, vi } from "vitest";
import { SendLessonNote } from "./sendLessonNote";
import { RoleMismatchError } from "../account/assertRole";
import { LessonNoteRepository } from "../../ports/lessonNoteRepository";

function makeRepo(overrides: Partial<LessonNoteRepository> = {}): LessonNoteRepository {
  return {
    subscribeNotesForLesson: vi.fn(),
    publishNote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("SendLessonNote", () => {
  it("publishes a note when the viewer role matches the note type (tutor)", async () => {
    const repo = makeRepo();
    const useCase = new SendLessonNote(repo);

    await useCase.execute(
      {
        lessonId: "lesson-1",
        viewerPubkey: "tutor-1",
        noteType: "tutor",
        content: "Good progress today",
      },
      "tutor"
    );

    expect(repo.publishNote).toHaveBeenCalledOnce();
    const [, note, recipient] = (repo.publishNote as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note.lessonId).toBe("lesson-1");
    expect(note.authorPubkey).toBe("tutor-1");
    expect(note.noteType).toBe("tutor");
    expect(note.content).toBe("Good progress today");
    expect(recipient).toBe("tutor-1");
  });

  it("publishes a note when the viewer role matches the note type (student)", async () => {
    const repo = makeRepo();
    const useCase = new SendLessonNote(repo);

    await useCase.execute(
      {
        lessonId: "lesson-1",
        viewerPubkey: "student-1",
        noteType: "student",
        content: "I understood the topic",
      },
      "student"
    );

    expect(repo.publishNote).toHaveBeenCalledOnce();
  });

  it("refuses to publish a tutor note when the viewer is a student", async () => {
    const repo = makeRepo();
    const useCase = new SendLessonNote(repo);

    await expect(
      useCase.execute(
        {
          lessonId: "lesson-1",
          viewerPubkey: "student-1",
          noteType: "tutor",
          content: "Should not publish",
        },
        "student"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publishNote).not.toHaveBeenCalled();
  });

  it("refuses to publish a student note when the viewer is a tutor", async () => {
    const repo = makeRepo();
    const useCase = new SendLessonNote(repo);

    await expect(
      useCase.execute(
        {
          lessonId: "lesson-1",
          viewerPubkey: "tutor-1",
          noteType: "student",
          content: "Should not publish",
        },
        "tutor"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publishNote).not.toHaveBeenCalled();
  });
});
