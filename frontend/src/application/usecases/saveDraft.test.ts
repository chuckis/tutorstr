import { describe, expect, it, vi } from "vitest";
import { SaveDraft } from "./saveDraft";
import { RoleMismatchError } from "../account/assertRole";
import type { DraftRepository } from "../../ports/draftRepository";
import type { BlogDraft } from "../../domain/blog";

function makeDraft(): BlogDraft {
  return {
    id: "draft-1",
    title: "Test Draft",
    body: "Draft body",
    summary: "",
    tags: [],
    savedAt: Date.now(),
  };
}

function makeDraftRepo(): DraftRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SaveDraft", () => {
  it("saves a draft for a tutor", async () => {
    const draftRepo = makeDraftRepo();
    const useCase = new SaveDraft(draftRepo);
    const draft = makeDraft();

    await useCase.execute(draft, "tutor");

    expect(draftRepo.save).toHaveBeenCalledWith(draft);
  });

  it("throws when the viewer is a student", async () => {
    const draftRepo = makeDraftRepo();
    const useCase = new SaveDraft(draftRepo);

    await expect(
      useCase.execute(makeDraft(), "student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(draftRepo.save).not.toHaveBeenCalled();
  });
});
