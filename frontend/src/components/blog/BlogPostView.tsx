import type { BlogPost } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { useTutorBlog } from "../../hooks/useTutorBlog";
import { BlogPostFull } from "./BlogPostFull";
import { DetailPageLayout } from "../DetailPageLayout";
import { Spinner } from "../Spinner";

type BlogPostViewProps = {
  post: BlogPost;
  authorId: string;
  onBack: () => void;
};

export function BlogPostView({ post, authorId, onBack }: BlogPostViewProps) {
  const { t } = useI18n();
  const { posts, loading } = useTutorBlog(authorId);
  const authorPost = posts.find((p) => p.id === post.id) ?? post;

  if (loading) {
    return <Spinner />;
  }

  return (
    <DetailPageLayout
      backLabel={t("common.buttons.back")}
      onBack={onBack}
      title={authorPost.title}
    >
      <BlogPostFull post={authorPost} />
    </DetailPageLayout>
  );
}
