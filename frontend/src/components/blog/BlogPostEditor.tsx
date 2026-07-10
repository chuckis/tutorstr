import { useState, useRef, useEffect, useCallback } from "react";
import type { AccountRole } from "../../domain/account";
import type { BlogDraft } from "../../domain/blog";
import { normalizeTags } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../ui/Button";
import { useEditorImageUpload } from "../../hooks/useEditorImageUpload";

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor";
import { toolbarPlugin } from "@mdxeditor/editor";
import { headingsPlugin } from "@mdxeditor/editor";
import { listsPlugin } from "@mdxeditor/editor";
import { linkPlugin } from "@mdxeditor/editor";
import { linkDialogPlugin } from "@mdxeditor/editor";
import { imagePlugin } from "@mdxeditor/editor";
import { quotePlugin } from "@mdxeditor/editor";
import { codeBlockPlugin } from "@mdxeditor/editor";
import { markdownShortcutPlugin } from "@mdxeditor/editor";
import { diffSourcePlugin } from "@mdxeditor/editor";

import { UndoRedo } from "@mdxeditor/editor";
import { BoldItalicUnderlineToggles } from "@mdxeditor/editor";
import { CodeToggle } from "@mdxeditor/editor";
import { BlockTypeSelect } from "@mdxeditor/editor";
import { CreateLink } from "@mdxeditor/editor";
import { InsertImage } from "@mdxeditor/editor";
import { ListsToggle } from "@mdxeditor/editor";
import { Separator } from "@mdxeditor/editor";
import { DiffSourceToggleWrapper } from "@mdxeditor/editor";

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
  const { uploadImage } = useEditorImageUpload();
  const editorRef = useRef<MDXEditorMethods>(null);
  const [title, setTitle] = useState(initialDraft.title);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [body, setBody] = useState(initialDraft.body);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialDraft.tags);

  useEffect(() => {
    editorRef.current?.setMarkdown(initialDraft.body);
  }, [initialDraft.body]);

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
      body: editorRef.current?.getMarkdown() ?? body,
      tags: normalizeTags(tags),
      savedAt: Date.now(),
    };
  }

  function canPublish(): boolean {
    const currentBody = editorRef.current?.getMarkdown() ?? body;
    return title.trim().length > 0 && currentBody.trim().length > 0;
  }

  const handleChange = useCallback((md: string) => {
    setBody(md);
  }, []);

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
          <MDXEditor
            ref={editorRef}
            markdown={body}
            onChange={handleChange}
            contentEditableClassName="blog-editor__body"
            plugins={[
              toolbarPlugin({
                toolbarClassName: "blog-editor__toolbar",
                toolbarContents: () => (
                  <>
                    <UndoRedo />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <Separator />
                    <BlockTypeSelect />
                    <CreateLink />
                    <InsertImage />
                    <ListsToggle />
                    <Separator />
                    <DiffSourceToggleWrapper>
                      <></>
                    </DiffSourceToggleWrapper>
                  </>
                ),
              }),
              headingsPlugin(),
              listsPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              imagePlugin({
                imageUploadHandler: uploadImage,
              }),
              quotePlugin(),
              codeBlockPlugin(),
              markdownShortcutPlugin(),
              diffSourcePlugin(),
            ]}
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
