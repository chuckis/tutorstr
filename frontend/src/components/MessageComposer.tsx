import { useState, useRef, useCallback, DragEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";

type FilePreview = {
  file: File;
  previewUrl: string;
};

type MessageComposerProps = {
  onSend: (text: string) => void;
  onSendWithFiles?: (text: string, files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
};

function createPreviewUrl(file: File): string {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file);
  }
  return "";
}

export function MessageComposer({
  onSend,
  onSendWithFiles,
  isUploading = false,
  uploadProgress = 0,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
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
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const entry = prev[index];
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      if (files.length > 0 && onSendWithFiles) {
        onSendWithFiles(
          text,
          files.map((f) => f.file)
        );
        setText("");
        files.forEach((f) => {
          if (f.previewUrl) {
            URL.revokeObjectURL(f.previewUrl);
          }
        });
        setFiles([]);
        return;
      }

      onSend(text);
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
              <button
                type="button"
                className="chip-remove"
                onClick={() => removeFile(index)}
                disabled={isUploading}
                aria-label={t("common.actions.remove")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {isUploading && uploadProgress > 0 ? (
        <div className="upload-progress-bar">
          <div
            className="upload-progress-fill"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      ) : null}

      <div className="composer-input-row">
        <button
          type="button"
          className="composer-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label={t("common.messages.attach")}
        >
          +
        </button>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("common.messages.placeholder")}
          disabled={isUploading}
        />
        <button type="submit" disabled={!hasContent || isUploading}>
          {isUploading
            ? t("common.states.uploading")
            : t("common.buttons.sendMessage")}
        </button>
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
