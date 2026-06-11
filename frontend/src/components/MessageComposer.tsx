import { useState, useRef, useCallback, DragEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

type FilePreview = {
  file: File;
  previewUrl: string;
};

type MessageComposerProps = {
  onSend: (text: string) => void | Promise<void>;
  onSendWithFiles?: (text: string, files: File[]) => void | Promise<void>;
};

type FileStatus = "idle" | "selected" | "uploading" | "sent" | "failed";

function createPreviewUrl(file: File): string {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file);
  }
  return "";
}

export function MessageComposer({
  onSend,
  onSendWithFiles,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const addFiles = useCallback((fileList: FileList) => {
    const newPreviews = Array.from(fileList)
      .filter((f) => f.size > 0)
      .map((file) => ({
        file,
        previewUrl: createPreviewUrl(file),
      }));
    setFiles((prev) => [...prev, ...newPreviews]);
    if (newPreviews.length > 0) {
      setFileStatus("selected");
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const entry = prev[index];
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setFileStatus("idle");
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (files.length > 0 && onSendWithFiles) {
        try {
          setFileStatus("uploading");
          await onSendWithFiles(
            text,
            files.map((f) => f.file)
          );
          setFileStatus("sent");
          setText("");
          files.forEach((f) => {
            if (f.previewUrl) {
              URL.revokeObjectURL(f.previewUrl);
            }
          });
          setFiles([]);
          window.setTimeout(() => setFileStatus("idle"), 2500);
        } catch {
          setFileStatus("failed");
        }
        return;
      }

      await onSend(text);
      setText("");
    },
    [text, files, onSend, onSendWithFiles]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const hasContent = text.trim().length > 0 || files.length > 0;
  const isUploading = fileStatus === "uploading";
  const canSendFiles = files.length === 0 || Boolean(onSendWithFiles);

  function getFileStatusLabel() {
    if (fileStatus === "selected") {
      return t("common.messages.filesSelected", { count: files.length });
    }
    if (fileStatus === "uploading") {
      return t("common.states.uploading");
    }
    if (fileStatus === "sent") {
      return t("common.messages.attachmentsSent");
    }
    if (fileStatus === "failed") {
      return t("common.messages.uploadFailed");
    }
    return "";
  }

  return (
    <form
      className={`message-composer ${isDragOver ? "drag-over" : ""}`}
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {files.length > 0 ? (
        <div className="composer-file-previews">
          {files.map((entry, index) => (
            <div key={`${entry.file.name}-${index}`} className="composer-file-chip">
              {entry.previewUrl ? (
                <img src={entry.previewUrl} alt="" className="chip-preview" />
              ) : (
                <span className="chip-icon">FILE</span>
              )}
              <span className="chip-name">{entry.file.name}</span>
              <Button variant="ghost" size="sm"
                type="button"
                className="chip-remove"
                onClick={() => removeFile(index)}
                disabled={isUploading}
                aria-label={t("common.actions.remove")}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {fileStatus !== "idle" ? (
        <p className={`muted composer-file-status composer-file-status-${fileStatus}`}>
          {getFileStatusLabel()}
        </p>
      ) : null}

      {isUploading ? (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" />
        </div>
      ) : null}

      <div className="composer-input-row">
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("common.messages.placeholder")}
          disabled={isUploading}
        />
        <Button variant="ghost" size="sm"
          type="button"
          className="composer-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label={t("common.messages.attach")}
        >
          +
        </Button>
        <Button variant="primary" type="submit" disabled={!hasContent || isUploading || !canSendFiles}>
          {isUploading
            ? t("common.states.uploading")
            : t("common.buttons.sendMessage")}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        className="composer-file-input"
        onChange={handleFileSelect}
        hidden
      />
    </form>
  );
}
