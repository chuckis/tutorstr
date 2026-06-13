import { describe, expect, it, vi } from "vitest";
import { GetTutorBlog } from "./getTutorBlog";
import type { BlogRepository } from "../../ports/blogRepository";
import type { BlogPost } from "../../domain/blog";

function makeBlogRepo(posts: BlogPost[]): BlogRepository {
  return {
    publish: vi.fn(),
    requestDeletion: vi.fn(),
    getByAuthor: vi.fn().mockResolvedValue(posts),
    getById: vi.fn(),
  };
}

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post-1",
    authorId: "author-1",
    title: "Test",
    body: "Body",
    summary: "",
    tags: [],
    status: "published",
    publishedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("GetTutorBlog", () => {
  it("returns published posts for a tutor", async () => {
    const posts = [makePost(), makePost({ id: "post-2" })];
    const blogRepo = makeBlogRepo(posts);
    const useCase = new GetTutorBlog(blogRepo);

    const result = await useCase.execute("author-1");

    expect(result).toHaveLength(2);
    expect(blogRepo.getByAuthor).toHaveBeenCalledWith("author-1");
  });

  it("filters out deletion_requested posts", async () => {
    const posts = [
      makePost({ id: "post-1" }),
      makePost({ id: "post-2", status: "deletion_requested" }),
    ];
    const blogRepo = makeBlogRepo(posts);
    const useCase = new GetTutorBlog(blogRepo);

    const result = await useCase.execute("author-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("post-1");
  });

  it("returns empty array when no posts exist", async () => {
    const blogRepo = makeBlogRepo([]);
    const useCase = new GetTutorBlog(blogRepo);

    const result = await useCase.execute("author-1");

    expect(result).toEqual([]);
  });
});
