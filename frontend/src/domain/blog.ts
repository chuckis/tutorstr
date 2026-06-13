export type BlogPostStatus = "published" | "deletion_requested";

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  summary: string;
  tags: string[];
  status: BlogPostStatus;
  publishedAt: number;
  updatedAt: number;
}

export interface BlogDraft {
  id: string;
  title: string;
  body: string;
  summary: string;
  tags: string[];
  savedAt: number;
}

export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of raw) {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
    if (result.length >= 7) break;
  }
  return result;
}

export function isBlogPostValid(post: { title: string; body: string }): boolean {
  return post.title.trim().length > 0 && post.body.trim().length > 0;
}
