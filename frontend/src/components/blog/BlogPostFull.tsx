import type { BlogPost } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { marked } from "marked";

type BlogPostFullProps = {
  post: BlogPost;
  onBack?: () => void;
  authorName?: string;
};

export function BlogPostFull({ post, authorName }: BlogPostFullProps) {
  const { t, formatDateTime } = useI18n();

  const html = marked(post.body, { breaks: true });

  return (
    <article className="tab-panel blog-full">
      <header className="blog-full__header">
        <h1>{post.title}</h1>
        <div className="blog-full__meta">
          {authorName ? <span>{authorName}</span> : null}
          <span className="muted">{formatDateTime(new Date(post.publishedAt * 1000).toISOString())}</span>
        </div>
      </header>
      {post.tags.length > 0 ? (
        <div className="chips blog-full__tags">
          {post.tags.map((tag) => (
            <span key={tag} className="chip">{tag}</span>
          ))}
        </div>
      ) : null}
      <div
        className="blog-full__body markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
