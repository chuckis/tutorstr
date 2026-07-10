import { useState, useEffect } from "react";
import type { AccountRole } from "../../domain/account";
import type { BlogDraft } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { useMyBlog } from "../../hooks/useMyBlog";
import { useRepo } from "../../hooks/RepoContext";
import { BlogPostEditor } from "./BlogPostEditor";
import { DetailPageLayout } from "../DetailPageLayout";
import { Spinner } from "../Spinner";

type BlogEditorViewProps = {
  draftId: string | null;
  role: AccountRole;
  pubkey: string;
  onClose: () => void;
};

export function BlogEditorView({ draftId, role, pubkey, onClose }: BlogEditorViewProps) {
  const { t } = useI18n();
  const { draftRepository } = useRepo();
  const { saveDraft, publish } = useMyBlog(pubkey, role);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "tutor") {
      onClose();
      return;
    }
  }, [role, onClose]);

  useEffect(() => {
    if (draftId === null) {
      setDraft({
        id: crypto.randomUUID(),
        title: "",
        body: "",
        summary: "",
        tags: [],
        savedAt: Date.now(),
      });
      setLoadingDraft(false);
    } else {
      setLoadingDraft(true);
      draftRepository.getById(draftId).then((found: BlogDraft | null) => {
        setDraft(found ?? {
          id: crypto.randomUUID(),
          title: "",
          body: "",
          summary: "",
          tags: [],
          savedAt: Date.now(),
        });
        setLoadingDraft(false);
      });
    }
  }, [draftId, draftRepository]);

  async function handleSave(nextDraft: BlogDraft) {
    setSaving(true);
    setError(null);
    try {
      await saveDraft(nextDraft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoSave(nextDraft: BlogDraft) {
    try {
      await saveDraft(nextDraft);
    } catch (err) {
      console.warn("Auto-save failed:", err);
    }
  }

  async function handlePublish(nextDraft: BlogDraft) {
    setPublishing(true);
    setError(null);
    try {
      await publish(nextDraft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPublishing(false);
    }
  }

  if (loadingDraft) {
    return <Spinner label={t("common.states.loading")} />;
  }

  if (!draft) return null;

  return (
    <DetailPageLayout
      backLabel={t("common.buttons.back")}
      onBack={onClose}
      title={draftId === null ? t("blog.editor.newPost") : t("blog.editor.editPost")}
    >
      <article className="panel">
        {error ? <p className="error-message">{error}</p> : null}
        <BlogPostEditor
          draft={draft}
          role={role}
          onSave={handleSave}
          onPublish={handlePublish}
          onDiscard={onClose}
          onAutoSave={handleAutoSave}
          saving={saving}
          publishing={publishing}
        />
      </article>
    </DetailPageLayout>
  );
}
