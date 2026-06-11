import { useState } from "react";
import { MessageAttachment } from "../hooks/hookTypes";
import { ImageViewer } from "./ImageViewer";
import { Button } from "./ui/Button";

type MessageAttachmentPreviewProps = {
  attachments: MessageAttachment[];
};

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function Thumbnail({ att, index, onClick }: {
  att: MessageAttachment;
  index: number;
  onClick: (i: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = !failed && att.thumbnailUrl ? att.thumbnailUrl : att.url;

  return (
    <Button variant="ghost"
      type="button"
      className="attachment-thumb"
      onClick={() => onClick(index)}
      aria-label={att.fileName || "image attachment"}
    >
      <img
        src={src}
        alt={att.fileName || ""}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </Button>
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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  const viewerImages = images.map((a) => ({
    url: a.url,
    thumbnailUrl: a.thumbnailUrl,
    fileName: a.fileName,
  }));

  return (
    <div className="message-attachments">
      {images.length > 0 ? (
        <div className={`attachment-grid attachment-grid-${Math.min(images.length, 4)}`}>
          {images.map((att, i) => (
            <Thumbnail key={att.url} att={att} index={i} onClick={setViewerIndex} />
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
      {viewerIndex !== null ? (
        <ImageViewer
          images={viewerImages}
          defaultIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>
  );
}
