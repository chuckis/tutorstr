import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { BlogRepository } from "../../ports/blogRepository";

export class DeleteBlogPost {
  constructor(private blogRepo: BlogRepository) {}

  async execute(
    postId: string,
    authorId: string,
    viewerRole: AccountRole
  ): Promise<void> {
    assertRole(viewerRole, "tutor");
    await this.blogRepo.requestDeletion(postId, authorId);
  }
}
