import type { BlogDraft } from "../domain/blog";

export interface DraftRepository {
  save(draft: BlogDraft): Promise<void>;
  getAll(): Promise<BlogDraft[]>;
  getById(id: string): Promise<BlogDraft | null>;
  delete(id: string): Promise<void>;
}
