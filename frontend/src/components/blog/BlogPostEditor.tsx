import { useState } from "react";
import type { AccountRole } from "../../domain/account";
import type { BlogDraft } from "../../domain/blog";
import { normalizeTags } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../ui/Button";

type BlogPostEditorProps = {
  draft: BlogDraft;
  role: AccountRole;
  onSave: (draft: BlogDraft) => Promise<void>;
  onPublish: (draft: BlogDraft) => Promise<void>;
  onDiscard: () => void;
  saving?: boolean;
  publishing?: boolean;
};

export function BlogPostEditor({
  draft: initialDraft,
  role,
  onSave,
  onPublish,
  onDiscard,
  saving,
  publishing,
}: BlogPostEditorProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialDraft.title);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [body, setBody] = useState(initialDraft.body);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialDraft.tags);

  function handleAddTag() {
    const normalized = normalizeTags([tagInput]);
    if (normalized.length > 0 && !tags.includes(normalized[0])) {
      setTags([...tags, normalized[0]]);
    }
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function getDraft(): BlogDraft {
    return {
      ...initialDraft,
      title: title.trim(),
      summary: summary.trim(),
      body,
      tags: normalizeTags(tags),
      savedAt: Date.now(),
    };
  }

  function canPublish(): boolean {
    return title.trim().length > 0 && body.trim().length > 0;
  }

  return (
    <section className="tab-panel blog-editor">
      <div className="stack">
        <div className="form-field">
          <input
            type="text"
            className="input"
            placeholder={t("blog.editor.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="form-field">
          <input
            type="text"
            className="input"
            placeholder={t("blog.editor.summaryPlaceholder")}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="form-field">
          <textarea
            className="textarea blog-editor__body"
            placeholder={t("blog.editor.bodyPlaceholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
          />
        </div>
        <div className="form-field">
          <div className="tag-input-row">
            <input
              type="text"
              className="input"
              placeholder={t("blog.editor.tagsPlaceholder")}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
              }}
            />
            <Button variant="secondary" size="sm" onClick={handleAddTag}>
              {t("common.actions.add")}
            </Button>
          </div>
          {tags.length > 0 ? (
            <div className="chips">
              {tags.map((tag) => (
                <span key={tag} className="chip chip--removable" onClick={() => handleRemoveTag(tag)}>
                  {tag} &times;
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="blog-editor__actions">
          <Button variant="secondary" onClick={onDiscard}>
            {t("blog.discard")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onSave(getDraft())}
            loading={saving}
          >
            {t("blog.saveDraft")}
          </Button>
          <Button
            variant="primary"
            onClick={() => onPublish(getDraft())}
            disabled={!canPublish()}
            loading={publishing}
          >
            {t("blog.publish")}
          </Button>
        </div>
      </div>
    </section>
  );
}
