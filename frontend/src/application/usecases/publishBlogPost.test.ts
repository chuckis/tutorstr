import { describe, expect, it, vi } from "vitest";
import { PublishBlogPost } from "./publishBlogPost";
import { RoleMismatchError } from "../account/assertRole";
import type { BlogRepository } from "../../ports/blogRepository";
import type { DraftRepository } from "../../ports/draftRepository";
import type { BlogDraft } from "../../domain/blog";

function makeDraft(overrides: Partial<BlogDraft> = {}): BlogDraft {
  return {
    id: "draft-1",
    title: "Test Post",
    body: "Test body content",
    summary: "A test summary",
    tags: ["test", "blog"],
    savedAt: Date.now(),
    ...overrides,
  };
}

function makeBlogRepo(): BlogRepository {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    requestDeletion: vi.fn().mockResolvedValue(undefined),
    getByAuthor: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
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

describe("PublishBlogPost", () => {
  it("publishes a valid draft and deletes the draft", async () => {
    const blogRepo = makeBlogRepo();
    const draftRepo = makeDraftRepo();
    const useCase = new PublishBlogPost(blogRepo, draftRepo);
    const draft = makeDraft();

    await useCase.execute(draft, "author-1", "tutor");

    expect(blogRepo.publish).toHaveBeenCalledOnce();
    expect(draftRepo.delete).toHaveBeenCalledWith("draft-1");
  });

  it("throws when the viewer is a student", async () => {
    const blogRepo = makeBlogRepo();
    const draftRepo = makeDraftRepo();
    const useCase = new PublishBlogPost(blogRepo, draftRepo);

    await expect(
      useCase.execute(makeDraft(), "author-1", "student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(blogRepo.publish).not.toHaveBeenCalled();
    expect(draftRepo.delete).not.toHaveBeenCalled();
  });

  it("throws when the draft is missing a title", async () => {
    const blogRepo = makeBlogRepo();
    const draftRepo = makeDraftRepo();
    const useCase = new PublishBlogPost(blogRepo, draftRepo);

    await expect(
      useCase.execute(makeDraft({ title: "" }), "author-1", "tutor")
    ).rejects.toThrow("Blog post is invalid");

    expect(blogRepo.publish).not.toHaveBeenCalled();
  });

  it("throws when the draft is missing a body", async () => {
    const blogRepo = makeBlogRepo();
    const draftRepo = makeDraftRepo();
    const useCase = new PublishBlogPost(blogRepo, draftRepo);

    await expect(
      useCase.execute(makeDraft({ body: "" }), "author-1", "tutor")
    ).rejects.toThrow("Blog post is invalid");

    expect(blogRepo.publish).not.toHaveBeenCalled();
  });
});
