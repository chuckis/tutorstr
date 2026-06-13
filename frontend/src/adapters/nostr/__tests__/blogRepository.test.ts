import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPost } from "../../../domain/blog";

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post-1",
    authorId: "a".repeat(64),
    title: "Test Post",
    body: "Hello **world**",
    summary: "A short summary",
    tags: ["test", "blog"],
    status: "published",
    publishedAt: 1718000000,
    updatedAt: 1718000000,
    ...overrides,
  };
}

describe("blogPostToNostrEvent", () => {
  it("produces a valid event shape", async () => {
    const { blogPostToNostrEvent } = await import("../blogRepository");
    const post = makePost();
    const draft = blogPostToNostrEvent(post);

    expect(draft.kind).toBe(30005);
    expect(draft.content).toBe("Hello **world**");
    expect(draft.tags).toContainEqual(["d", "post-1"]);
    expect(draft.tags).toContainEqual(["title", "Test Post"]);
    expect(draft.tags).toContainEqual(["summary", "A short summary"]);
    expect(draft.tags).toContainEqual(["published_at", "1718000000"]);
    expect(draft.tags).toContainEqual(["t", "test"]);
    expect(draft.tags).toContainEqual(["t", "blog"]);
  });

  it("omits summary when empty", async () => {
    const { blogPostToNostrEvent } = await import("../blogRepository");
    const post = makePost({ summary: "" });
    const draft = blogPostToNostrEvent(post);

    const summaryTag = draft.tags.find((t) => t[0] === "summary");
    expect(summaryTag).toBeUndefined();
  });
});

describe("nostrEventToBlogPost", () => {
  it("round-trips a post through event and back", async () => {
    const { blogPostToNostrEvent, nostrEventToBlogPost } = await import("../blogRepository");
    const original = makePost();
    const draft = blogPostToNostrEvent(original);

    const event = {
      id: "evt-1",
      pubkey: original.authorId,
      created_at: original.updatedAt,
      kind: 30005,
      tags: draft.tags,
      content: draft.content,
      sig: "s".repeat(128),
    };

    const result = nostrEventToBlogPost(event);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(original.id);
    expect(result!.title).toBe(original.title);
    expect(result!.body).toBe(original.body);
    expect(result!.summary).toBe(original.summary);
    expect(result!.tags).toEqual(original.tags);
    expect(result!.publishedAt).toBe(original.publishedAt);
    expect(result!.authorId).toBe(original.authorId);
  });

  it("returns null for wrong kind", async () => {
    const { nostrEventToBlogPost } = await import("../blogRepository");

    const event = {
      id: "evt-1",
      pubkey: "a".repeat(64),
      created_at: 1000,
      kind: 1,
      tags: [],
      content: "hello",
      sig: "s".repeat(128),
    };

    expect(nostrEventToBlogPost(event)).toBeNull();
  });

  it("returns null when d tag is missing", async () => {
    const { nostrEventToBlogPost } = await import("../blogRepository");

    const event = {
      id: "evt-1",
      pubkey: "a".repeat(64),
      created_at: 1000,
      kind: 30005,
      tags: [["title", "Hello"]],
      content: "body",
      sig: "s".repeat(128),
    };

    expect(nostrEventToBlogPost(event)).toBeNull();
  });

  it("returns null when published_at is not a number", async () => {
    const { nostrEventToBlogPost } = await import("../blogRepository");

    const event = {
      id: "evt-1",
      pubkey: "a".repeat(64),
      created_at: 1000,
      kind: 30005,
      tags: [
        ["d", "post-1"],
        ["title", "Hello"],
        ["published_at", "not-a-number"],
      ],
      content: "body",
      sig: "s".repeat(128),
    };

    expect(nostrEventToBlogPost(event)).toBeNull();
  });
});
