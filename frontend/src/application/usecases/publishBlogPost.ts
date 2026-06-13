import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { BlogDraft, BlogPost } from "../../domain/blog";
import { isBlogPostValid } from "../../domain/blog";
import type { BlogRepository } from "../../ports/blogRepository";
import type { DraftRepository } from "../../ports/draftRepository";

export class PublishBlogPost {
  constructor(
    private blogRepo: BlogRepository,
    private draftRepo: DraftRepository
  ) {}

  async execute(
    draft: BlogDraft,
    authorId: string,
    viewerRole: AccountRole
  ): Promise<void> {
    assertRole(viewerRole, "tutor");

    if (!isBlogPostValid(draft)) {
      throw new Error("Blog post is invalid: title and body are required");
    }

    const now = Math.floor(Date.now() / 1000);

    const post: BlogPost = {
      id: draft.id,
      authorId,
      title: draft.title,
      body: draft.body,
      summary: draft.summary,
      tags: draft.tags,
      status: "published",
      publishedAt: now,
      updatedAt: now,
    };

    await this.blogRepo.publish(post);
    await this.draftRepo.delete(draft.id);
  }
}
