import type { BlogPost } from "../domain/blog";

export interface BlogRepository {
  publish(post: BlogPost): Promise<void>;
  requestDeletion(postId: string, authorId: string): Promise<void>;
  getByAuthor(authorId: string): Promise<BlogPost[]>;
  getById(postId: string, authorId: string): Promise<BlogPost | null>;
}
