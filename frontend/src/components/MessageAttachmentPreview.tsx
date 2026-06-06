import { useState } from "react";
import { MessageAttachment } from "../hooks/hookTypes";

type MessageAttachmentPreviewProps = {
  attachments: MessageAttachment[];
};

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function AttachmentImage({ url, mimeType, fileName }: MessageAttachment) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="attachment-thumb"
        onClick={() => setOpen(true)}
        aria-label={fileName || "image attachment"}
      >
        <img src={url} alt={fileName || ""} loading="lazy" />
      </button>
      {open ? (
        <div className="attachment-lightbox" onClick={() => setOpen(false)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
          <img src={url} alt={fileName || ""} className="lightbox-image" />
        </div>
      ) : null}
    </>
  );
}

function AttachmentFile({ url, mimeType, fileName, size }: MessageAttachment) {
  const displayName = fileName || url.split("/").pop() || "file";
  const sizeLabel = size
    ? ` (${(size / 1024).toFixed(1)} KB)`
    : "";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="attachment-file"
    >
      <span className="attachment-file-icon">
        {mimeType.includes("pdf") ? "PDF" : "FILE"}
      </span>
      <span className="attachment-file-name">
        {displayName}
        {sizeLabel}
      </span>
    </a>
  );
}

export function MessageAttachmentPreview({ attachments }: MessageAttachmentPreviewProps) {
  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="message-attachments">
      {images.length > 0 ? (
        <div className={`attachment-grid attachment-grid-${Math.min(images.length, 4)}`}>
          {images.map((att) => (
            <AttachmentImage key={att.url} {...att} />
          ))}
        </div>
      ) : null}
      {files.length > 0 ? (
        <div className="attachment-file-list">
          {files.map((att) => (
            <AttachmentFile key={att.url} {...att} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
