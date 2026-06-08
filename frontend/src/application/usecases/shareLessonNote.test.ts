import { describe, expect, it, vi } from "vitest";
import { ShareLessonNote } from "./shareLessonNote";
import { RoleMismatchError } from "../account/assertRole";
import { LessonNoteRepository } from "../../ports/lessonNoteRepository";

function makeRepo(overrides: Partial<LessonNoteRepository> = {}): LessonNoteRepository {
  return {
    subscribeNotesForLesson: vi.fn(),
    publishNote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ShareLessonNote", () => {
  const sharedInput = {
    lessonId: "lesson-1",
    viewerPubkey: "tutor-1",
    recipientPubkey: "student-1",
    noteType: "tutor" as const,
    content: "Great session summary",
  };

  it("publishes a note to the recipient when the viewer role matches", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await useCase.execute(sharedInput, "tutor");

    expect(repo.publishNote).toHaveBeenCalledOnce();
    const [, note, recipient] = (repo.publishNote as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note.lessonId).toBe("lesson-1");
    expect(note.authorPubkey).toBe("tutor-1");
    expect(note.noteType).toBe("tutor");
    expect(note.content).toBe("Great session summary");
    expect(recipient).toBe("student-1");
  });

  it("publishes a shared note when student role matches student noteType", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await useCase.execute(
      {
        ...sharedInput,
        noteType: "student",
        viewerPubkey: "student-1",
        recipientPubkey: "tutor-1",
      },
      "student"
    );

    expect(repo.publishNote).toHaveBeenCalledOnce();
  });

  it("refuses to share a tutor note when the viewer is a student", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await expect(
      useCase.execute(sharedInput, "student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publishNote).not.toHaveBeenCalled();
  });

  it("refuses to share a student note when the viewer is a tutor", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await expect(
      useCase.execute(
        { ...sharedInput, noteType: "student", viewerPubkey: "student-1", recipientPubkey: "tutor-1" },
        "tutor"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publishNote).not.toHaveBeenCalled();
  });

  it("does not publish when the viewer's role does not match (student tries to share tutor note)", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await expect(
      useCase.execute(
        {
          ...sharedInput,
          noteType: "tutor",
          viewerPubkey: "student-1",
          recipientPubkey: "tutor-1",
        },
        "student"
      )
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publishNote).not.toHaveBeenCalled();
  });
});

describe("ShareLessonNote with attachments", () => {
  it("publishes a note with attachments to the recipient", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);
    const attachments = [
      { url: "https://cdn.example.com/image.png", mimeType: "image/png", fileName: "diagram.png", size: 2048 },
    ];

    await useCase.execute(
      {
        lessonId: "lesson-1",
        viewerPubkey: "tutor-1",
        recipientPubkey: "student-1",
        noteType: "tutor",
        content: "Check the diagram",
        attachments,
      },
      "tutor"
    );

    expect(repo.publishNote).toHaveBeenCalledOnce();
    const [, note] = (repo.publishNote as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note.attachments).toEqual(attachments);
  });

  it("defaults to empty attachments when not provided", async () => {
    const repo = makeRepo();
    const useCase = new ShareLessonNote(repo);

    await useCase.execute(
      {
        lessonId: "lesson-1",
        viewerPubkey: "tutor-1",
        recipientPubkey: "student-1",
        noteType: "tutor",
        content: "No files",
      },
      "tutor"
    );

    const [, note] = (repo.publishNote as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(note.attachments).toEqual([]);
  });
});
