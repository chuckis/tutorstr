import type { BlogPost } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { BlogPostCard } from "./BlogPostCard";

type BlogPostListProps = {
  posts: BlogPost[];
  loading?: boolean;
  emptyLabel?: string;
  onSelectPost?: (post: BlogPost) => void;
};

export function BlogPostList({ posts, loading, emptyLabel, onSelectPost }: BlogPostListProps) {
  const { t } = useI18n();

  if (loading) {
    return <p className="muted">{t("common.states.loading")}</p>;
  }

  if (posts.length === 0) {
    return <p className="muted">{emptyLabel || t("blog.noPosts")}</p>;
  }

  return (
    <div className="stack">
      {posts.map((post) => (
        <BlogPostCard
          key={post.id}
          post={post}
          onClick={onSelectPost ? () => onSelectPost(post) : undefined}
        />
      ))}
    </div>
  );
}
