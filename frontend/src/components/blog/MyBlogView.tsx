import { useState } from "react";
import type { AccountRole } from "../../domain/account";
import type { BlogDraft } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { useMyBlog } from "../../hooks/useMyBlog";
import { BlogPostList } from "./BlogPostList";
import { DraftList } from "./DraftList";
import { DetailPageLayout } from "../DetailPageLayout";
import { Button } from "../ui/Button";

type MyBlogViewProps = {
  role: AccountRole;
  pubkey: string;
  onBack: () => void;
  onNewPost: () => void;
  onEditDraft: (draftId: string) => void;
  onSelectPost: (data: { id: string; authorId: string }) => void;
};

export function MyBlogView({ role, pubkey, onBack, onNewPost, onEditDraft, onSelectPost }: MyBlogViewProps) {
  const { t } = useI18n();
  const { posts, drafts, loading, deleteDraft, deletePost, publish } = useMyBlog(pubkey, role);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);

  async function handleDeleteDraft(id: string) {
    if (!confirm(t("blog.deleteDraftConfirm"))) return;
    await deleteDraft(id);
  }

  async function handleDeletePost(postId: string) {
    if (!confirm(t("blog.deletePostConfirm"))) return;
    await deletePost(postId);
  }

  async function handlePublishDraft(draft: BlogDraft) {
    setPublishingDraftId(draft.id);
    try {
      await publish(draft);
    } finally {
      setPublishingDraftId(null);
    }
  }

  return (
    <DetailPageLayout
      backLabel={t("common.buttons.back")}
      onBack={onBack}
      title={t("blog.title")}
      rightActions={
        <Button variant="primary" onClick={onNewPost}>
          {t("blog.newPost")}
        </Button>
      }
    >
      <article className="panel">
        <div className="stack">
          <h2>{t("blog.publishedPosts")}</h2>
          <BlogPostList
            posts={posts}
            loading={loading}
            onSelectPost={(post) => onSelectPost({ id: post.id, authorId: post.authorId })}
          />

          <h2>{t("blog.drafts")}</h2>
          <DraftList
            drafts={drafts}
            role={role}
            loading={loading}
            onEdit={(draft) => onEditDraft(draft.id)}
            onDelete={handleDeleteDraft}
            onPublish={handlePublishDraft}
            deleting={publishingDraftId !== null}
          />
        </div>
      </article>
    </DetailPageLayout>
  );
}
