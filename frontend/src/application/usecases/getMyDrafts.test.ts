import { describe, expect, it, vi } from "vitest";
import { GetMyDrafts } from "./getMyDrafts";
import { RoleMismatchError } from "../account/assertRole";
import type { DraftRepository } from "../../ports/draftRepository";
import type { BlogDraft } from "../../domain/blog";

function makeDraftRepo(drafts: BlogDraft[] = []): DraftRepository {
  return {
    save: vi.fn(),
    getAll: vi.fn().mockResolvedValue(drafts),
    getById: vi.fn(),
    delete: vi.fn(),
  };
}

describe("GetMyDrafts", () => {
  it("returns drafts for a tutor", async () => {
    const drafts: BlogDraft[] = [
      { id: "d-1", title: "Draft 1", body: "", summary: "", tags: [], savedAt: 1000 },
      { id: "d-2", title: "Draft 2", body: "", summary: "", tags: [], savedAt: 2000 },
    ];
    const draftRepo = makeDraftRepo(drafts);
    const useCase = new GetMyDrafts(draftRepo);

    const result = await useCase.execute("tutor");

    expect(result).toHaveLength(2);
  });

  it("throws when the viewer is a student", async () => {
    const draftRepo = makeDraftRepo();
    const useCase = new GetMyDrafts(draftRepo);

    await expect(
      useCase.execute("student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(draftRepo.getAll).not.toHaveBeenCalled();
  });
});
