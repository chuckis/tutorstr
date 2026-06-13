import type { BlogPost } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { toDisplayId } from "../../utils/display";

type BlogPostCardProps = {
  post: BlogPost;
  onClick?: () => void;
  displayAuthor?: string;
};

export function BlogPostCard({ post, onClick, displayAuthor }: BlogPostCardProps) {
  const { t, formatDateTime } = useI18n();

  return (
    <article className="panel blog-card" onClick={onClick} role="button" tabIndex={0}>
      <h3 className="blog-card__title">{post.title}</h3>
      {post.summary ? <p className="blog-card__summary">{post.summary}</p> : null}
      <div className="blog-card__meta">
        {displayAuthor ? <span>{displayAuthor}</span> : null}
        <span className="muted">{formatDateTime(new Date(post.publishedAt * 1000).toISOString())}</span>
      </div>
      {post.tags.length > 0 ? (
        <div className="chips blog-card__tags">
          {post.tags.map((tag) => (
            <span key={tag} className="chip">{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
