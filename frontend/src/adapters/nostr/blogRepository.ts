import type { BlogPost, BlogPostStatus } from "../../domain/blog";
import type { BlogRepository } from "../../ports/blogRepository";
import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { addKindListener } from "./eventBus";
import type { NostrEvent } from "../../nostr/client";

const KIND = TutorHubKind.TutorBlogPost;

function findTagValue(tags: string[][], name: string): string | undefined {
  for (const tag of tags) {
    if (tag[0] === name) return tag[1];
  }
  return undefined;
}

export function blogPostToNostrEvent(post: BlogPost): Pick<NostrEvent, "kind" | "tags" | "content"> {
  const tags: string[][] = [
    ["d", post.id],
    ["title", post.title],
    ["published_at", String(post.publishedAt)],
  ];
  if (post.summary) {
    tags.push(["summary", post.summary]);
  }
  for (const tag of post.tags) {
    tags.push(["t", tag]);
  }
  return { kind: KIND, tags, content: post.body };
}

export function nostrEventToBlogPost(event: NostrEvent): BlogPost | null {
  if (event.kind !== KIND) return null;
  const id = findTagValue(event.tags, "d");
  const title = findTagValue(event.tags, "title");
  const publishedAtStr = findTagValue(event.tags, "published_at");
  if (!id || !title || !publishedAtStr) return null;

  const publishedAt = parseInt(publishedAtStr, 10);
  if (isNaN(publishedAt)) return null;

  const summary = findTagValue(event.tags, "summary") || "";
  const tags: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] === "t") tags.push(tag[1]);
  }

  return {
    id,
    authorId: event.pubkey,
    title,
    body: event.content,
    summary,
    tags,
    status: "published" as BlogPostStatus,
    publishedAt,
    updatedAt: event.created_at,
  };
}

export function createNostrBlogRepository(): BlogRepository {
  async function fetchByAuthor(authorId: string): Promise<BlogPost[]> {
    return new Promise((resolve) => {
      const posts: BlogPost[] = [];

      const unsub = addKindListener(KIND, (event) => {
        const post = nostrEventToBlogPost(event);
        if (!post || post.authorId !== authorId) return;
        const idx = posts.findIndex((p) => p.id === post.id);
        if (idx >= 0) {
          posts[idx] = post;
        } else {
          posts.push(post);
        }
        posts.sort((a, b) => b.publishedAt - a.publishedAt);
      });

      setTimeout(() => {
        const result = posts.filter((p) => p.status !== "deletion_requested");
        resolve(result);
        unsub();
      }, 3000);
    });
  }

  return {
    async publish(post: BlogPost) {
      const draft = blogPostToNostrEvent(post);
      await nostrClient.publishReplaceableEvent(KIND, draft.content, draft.tags);
    },

    async requestDeletion(postId: string, authorId: string) {
      const posts = await fetchByAuthor(authorId);
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const deletionTags: string[][] = [
        ["a", `${KIND}:${authorId}:${postId}`],
      ];

      await nostrClient.publishEvent(5, "", deletionTags);
    },

    async getByAuthor(authorId: string): Promise<BlogPost[]> {
      return fetchByAuthor(authorId);
    },

    async getById(postId: string, authorId: string): Promise<BlogPost | null> {
      const posts = await fetchByAuthor(authorId);
      return posts.find((p) => p.id === postId) ?? null;
    },
  };
}
