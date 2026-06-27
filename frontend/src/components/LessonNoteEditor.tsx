import { useCallback, useRef, useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor";
import { toolbarPlugin } from "@mdxeditor/editor";
import { headingsPlugin } from "@mdxeditor/editor";
import { listsPlugin } from "@mdxeditor/editor";
import { linkPlugin } from "@mdxeditor/editor";
import { linkDialogPlugin } from "@mdxeditor/editor";
import { quotePlugin } from "@mdxeditor/editor";
import { codeBlockPlugin } from "@mdxeditor/editor";
import { markdownShortcutPlugin } from "@mdxeditor/editor";

import { UndoRedo } from "@mdxeditor/editor";
import { BoldItalicUnderlineToggles } from "@mdxeditor/editor";
import { CodeToggle } from "@mdxeditor/editor";
import { BlockTypeSelect } from "@mdxeditor/editor";
import { CreateLink } from "@mdxeditor/editor";
import { ListsToggle } from "@mdxeditor/editor";
import { Separator } from "@mdxeditor/editor";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

type ActionStatus = "idle" | "saving" | "published" | "shared" | "error";

type LessonNoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: (files?: File[]) => void;
  onPublish: (files?: File[]) => void;
  onShare: (files?: File[]) => void;
  publishStatus?: ActionStatus;
  shareStatus?: ActionStatus;
  uploadProgress?: "idle" | "uploading" | "done" | "error";
};

type FilePreview = {
  file: File;
  previewUrl: string;
};

function createPreviewUrl(file: File): string {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file);
  }
  return "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(
  status: ActionStatus,
  idleLabel: string,
  savingLabel: string,
  doneLabel: string,
  t: (key: string) => string
): string {
  switch (status) {
    case "saving":
      return savingLabel;
    case "published":
    case "shared":
      return doneLabel;
    case "error":
      return t("common.states.error");
    default:
      return idleLabel;
  }
}

export function LessonNoteEditor({
  value,
  onChange,
  onSave,
  onPublish,
  onShare,
  publishStatus = "idle",
  shareStatus = "idle",
  uploadProgress = "idle",
}: LessonNoteEditorProps) {
  const { t } = useI18n();
  const editorRef = useRef<MDXEditorMethods>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [fileError, setFileError] = useState("");
  const isEmpty = !value.trim();
  const isBusy = publishStatus === "saving" || shareStatus === "saving" || uploadProgress === "uploading";
  const hasFiles = filePreviews.length > 0;

  useEffect(() => {
    editorRef.current?.setMarkdown(value);
  }, [value]);

  const addFiles = useCallback((fileList: FileList) => {
    setFileError("");

    const remaining = MAX_FILES - filePreviews.length;
    if (remaining <= 0) {
      setFileError(t("lessons.tooManyFiles", { count: String(MAX_FILES) }));
      return;
    }

    const newPreviews: FilePreview[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size <= 0) continue;
      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(t("lessons.fileTooLarge", { name: file.name, size: sizeMb }));
        continue;
      }
      if (newPreviews.length >= remaining) break;
      newPreviews.push({
        file,
        previewUrl: createPreviewUrl(file),
      });
    }

    if (newPreviews.length > 0) {
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }
  }, [filePreviews.length, t]);

  const removeFile = useCallback((index: number) => {
    setFileError("");
    setFilePreviews((prev) => {
      const entry = prev[index];
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const handleSave = useCallback(() => {
    const files = hasFiles ? filePreviews.map((f) => f.file) : undefined;
    onSave(files);
  }, [onSave, filePreviews, hasFiles]);

  const handlePublish = useCallback(() => {
    const files = hasFiles ? filePreviews.map((f) => f.file) : undefined;
    onPublish(files);
  }, [onPublish, filePreviews, hasFiles]);

  const handleShare = useCallback(() => {
    const files = hasFiles ? filePreviews.map((f) => f.file) : undefined;
    onShare(files);
  }, [onShare, filePreviews, hasFiles]);

  const handleEditorChange = useCallback((md: string) => {
    onChange(md);
  }, [onChange]);

  return (
    <div className="lesson-note-editor">
      <label className="filter">
        {t("lessons.personalNote")}
        <MDXEditor
          ref={editorRef}
          markdown={value}
          onChange={handleEditorChange}
          contentEditableClassName="lesson-note-editor__body"
          plugins={[
            toolbarPlugin({
              toolbarClassName: "lesson-note-editor__toolbar",
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <BlockTypeSelect />
                  <CreateLink />
                  <ListsToggle />
                </>
              ),
            }),
            headingsPlugin(),
            listsPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            quotePlugin(),
            codeBlockPlugin(),
            markdownShortcutPlugin(),
          ]}
        />
      </label>

      {fileError ? (
        <p className="field-error">{fileError}</p>
      ) : null}

      {filePreviews.length > 0 ? (
        <div className="composer-file-previews">
          {filePreviews.map((entry, index) => (
            <div key={`${entry.file.name}-${index}`} className="composer-file-chip">
              {entry.previewUrl ? (
                <img src={entry.previewUrl} alt="" className="chip-preview" />
              ) : (
                <span className="chip-icon">FILE</span>
              )}
              <span className="chip-name">{entry.file.name}</span>
              <span className="chip-size">{formatFileSize(entry.file.size)}</span>
              <Button variant="ghost" size="sm"
                type="button"
                className="chip-remove"
                onClick={() => removeFile(index)}
                disabled={isBusy}
                aria-label={t("common.actions.remove")}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {uploadProgress === "uploading" ? (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" />
        </div>
      ) : null}

      <p className="attachment-info">{t("lessons.attachmentInfo")}</p>

      <div className="lesson-note-actions">
        <Button variant="ghost" size="sm"
          type="button"
          className="composer-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          aria-label={t("common.messages.attach")}
        >
          +
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.md"
          multiple
          className="composer-file-input"
          onChange={handleFileSelect}
          hidden
        />
        <span className="max-file-hint">{t("lessons.maxFileSizeHint")}</span>
        <Button variant="ghost" size="sm"
          type="button"
          onClick={handleSave}
          disabled={isEmpty || isBusy}
        >
          {t("lessons.saveLocally")}
        </Button>
        <Button variant="ghost" size="sm"
          type="button"
          onClick={handlePublish}
          disabled={isEmpty || isBusy}
        >
          {statusLabel(publishStatus, t("lessons.publish"), t("common.states.saving"), t("lessons.published"), t)}
        </Button>
        <Button variant="ghost" size="sm"
          type="button"
          onClick={handleShare}
          disabled={isEmpty || isBusy}
        >
          {statusLabel(shareStatus, t("common.actions.share"), t("common.states.saving"), t("lessons.shared"), t)}
        </Button>
      </div>
    </div>
  );
}
