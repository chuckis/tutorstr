import { useState, useRef, useCallback, DragEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useMessageComposer } from "../hooks/useMessageComposer";
import { Button } from "./ui/Button";

type MessageComposerProps = {
  onSend: (text: string) => void | Promise<void>;
  onSendWithFiles?: (text: string, files: File[]) => void | Promise<void>;
};

type FileStatus = "idle" | "selected" | "uploading" | "sent" | "failed";

export function MessageComposer({
  onSend,
  onSendWithFiles,
}: MessageComposerProps) {
  const {
    text,
    setText,
    files,
    filePreviews,
    isSending,
    addFiles,
    removeFile,
    clearFiles,
    send,
  } = useMessageComposer(onSend, onSendWithFiles);

  const [isDragOver, setIsDragOver] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const hasContent = text.trim().length > 0 || files.length > 0;
  const canSendFiles = files.length === 0 || Boolean(onSendWithFiles);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!hasContent) return;

      const hadFiles = files.length > 0;
      if (hadFiles) {
        setFileStatus("uploading");
      }

      try {
        await send();
        if (hadFiles) {
          setFileStatus("sent");
          window.setTimeout(() => setFileStatus("idle"), 2500);
        }
      } catch {
        if (hadFiles) {
          setFileStatus("failed");
        }
      }
    },
    [hasContent, files.length, send]
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
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="composer-file-chip">
              {filePreviews[index] ? (
                <img src={filePreviews[index]} alt="" className="chip-preview" />
              ) : (
                <span className="chip-icon">FILE</span>
              )}
              <span className="chip-name">{file.name}</span>
              <Button variant="ghost" size="sm"
                type="button"
                className="chip-remove"
                onClick={() => removeFile(index)}
                disabled={isSending}
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

      {fileStatus === "uploading" || isSending ? (
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
          disabled={isSending}
        />
        <Button variant="ghost" size="sm"
          type="button"
          className="composer-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label={t("common.messages.attach")}
        >
          +
        </Button>
        <Button variant="primary" type="submit" disabled={!hasContent || isSending || !canSendFiles}>
          {isSending
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
