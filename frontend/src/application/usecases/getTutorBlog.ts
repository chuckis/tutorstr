import type { BlogPost } from "../../domain/blog";
import type { BlogRepository } from "../../ports/blogRepository";

export class GetTutorBlog {
  constructor(private blogRepo: BlogRepository) {}

  async execute(authorId: string): Promise<BlogPost[]> {
    const posts = await this.blogRepo.getByAuthor(authorId);
    return posts.filter((p) => p.status !== "deletion_requested");
  }
}
