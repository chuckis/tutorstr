import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { BlogRepository } from "../../ports/blogRepository";

export class DeleteBlogPost {
  constructor(
    private blogRepo: BlogRepository,
    private onOptimisticUpdate?: (postId: string) => void,
    private onRollback?: (postId: string) => void,
  ) {}

  async execute(
    postId: string,
    authorId: string,
    viewerRole: AccountRole
  ): Promise<void> {
    assertRole(viewerRole, "tutor");

    this.onOptimisticUpdate?.(postId);
    try {
      await this.blogRepo.requestDeletion(postId, authorId);
    } catch (error) {
      this.onRollback?.(postId);
      throw error;
    }
  }
}
