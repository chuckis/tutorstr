import { describe, expect, it, vi } from "vitest";
import { DeleteBlogPost } from "./deleteBlogPost";
import { RoleMismatchError } from "../account/assertRole";
import type { BlogRepository } from "../../ports/blogRepository";

function makeBlogRepo(): BlogRepository {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    requestDeletion: vi.fn().mockResolvedValue(undefined),
    getByAuthor: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
  };
}

describe("DeleteBlogPost", () => {
  it("requests deletion for a tutor-owned post", async () => {
    const blogRepo = makeBlogRepo();
    const useCase = new DeleteBlogPost(blogRepo);

    await useCase.execute("post-1", "author-1", "tutor");

    expect(blogRepo.requestDeletion).toHaveBeenCalledWith("post-1", "author-1");
  });

  it("throws when the viewer is a student", async () => {
    const blogRepo = makeBlogRepo();
    const useCase = new DeleteBlogPost(blogRepo);

    await expect(
      useCase.execute("post-1", "author-1", "student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(blogRepo.requestDeletion).not.toHaveBeenCalled();
  });
});
