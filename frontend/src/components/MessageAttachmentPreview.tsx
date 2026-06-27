import { useState, useEffect, useCallback } from "react";
import { MessageAttachment } from "../hooks/hookTypes";
import { ImageViewer } from "./ImageViewer";
import { Button } from "./ui/Button";
import { useI18n } from "../i18n/I18nProvider";
import { webCryptoFileEncryption } from "../adapters/crypto/webCryptoFileEncryption";

type MessageAttachmentPreviewProps = {
  attachments: MessageAttachment[];
};

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function getFileIcon(mimeType: string, fileName?: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("markdown") || mimeType.includes("md") || fileName?.endsWith(".md")) return "MD";
  if (mimeType.includes("text")) return "TXT";
  return "FILE";
}

function isSessionOnlyUrl(url: string): boolean {
  return url.startsWith("blob:");
}

function useDecryptedAttachment(att: MessageAttachment) {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState(false);
  const sessionOnly = att.encryptionKey ? isSessionOnlyUrl(att.url) : false;

  useEffect(() => {
    if (!att.encryptionKey) return;
    if (sessionOnly) {
      // blob: URLs are session-only — stale on re-render, skip fetch
      setError(true);
      setDecrypting(false);
      return;
    }
    let cancelled = false;
    setDecrypting(true);
    setError(false);

    (async () => {
      try {
        const resp = await fetch(att.url);
        const blob = await resp.blob();
        const decrypted = await webCryptoFileEncryption.decrypt(blob, att.encryptionKey!);
        if (cancelled) return;
        const url = URL.createObjectURL(decrypted);
        setDecryptedUrl(url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setDecrypting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
    };
  }, [att.url, att.encryptionKey, sessionOnly]);

  return { decryptedUrl, decrypting, error, sessionOnly };
}

function EncryptedThumbnail({ att, index, onClick }: {
  att: MessageAttachment;
  index: number;
  onClick: (i: number) => void;
}) {
  const { decryptedUrl, decrypting, error, sessionOnly } = useDecryptedAttachment(att);
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();

  if (decrypting) {
    return (
      <div className="attachment-thumb attachment-thumb--loading">
        <span className="muted">{t("lessons.decryptingAttachment")}</span>
      </div>
    );
  }

  if (sessionOnly) {
    return (
      <div className="attachment-thumb attachment-thumb--session">
        <span className="muted">{t("lessons.attachmentSessionOnly")}</span>
      </div>
    );
  }

  if (error || !decryptedUrl) {
    return (
      <div className="attachment-thumb attachment-thumb--error">
        <span className="muted">{t("common.states.error")}</span>
      </div>
    );
  }

  const src = !failed && att.thumbnailUrl ? att.thumbnailUrl : decryptedUrl;

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

function PlainThumbnail({ att, index, onClick }: {
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

function EncryptedAttachmentFile({ att }: { att: MessageAttachment }) {
  const { decryptedUrl, decrypting, error, sessionOnly } = useDecryptedAttachment(att);
  const { t } = useI18n();
  const displayName = att.fileName || att.url.split("/").pop() || "file";
  const sizeLabel = att.size
    ? ` (${(att.size / 1024).toFixed(1)} KB)`
    : "";

  if (decrypting) {
    return (
      <span className="attachment-file attachment-file--loading">
        <span className="muted">{t("lessons.decryptingAttachment")}</span>
      </span>
    );
  }

  if (sessionOnly) {
    return (
      <span className="attachment-file attachment-file--session">
        <span className="attachment-file-icon">!</span>
        <span className="attachment-file-name">{displayName}{sizeLabel} — {t("lessons.attachmentSessionOnly")}</span>
      </span>
    );
  }

  if (error || !decryptedUrl) {
    return (
      <span className="attachment-file attachment-file--error">
        <span className="muted">{t("common.states.error")}</span>
      </span>
    );
  }

  return (
    <a
      href={decryptedUrl}
      download={att.fileName || true}
      className="attachment-file"
    >
      <span className="attachment-file-icon">
        {getFileIcon(att.mimeType, att.fileName)}
      </span>
      <span className="attachment-file-name">
        {displayName}
        {sizeLabel}
      </span>
    </a>
  );
}

function PlainAttachmentFile({ url, mimeType, fileName, size }: MessageAttachment) {
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
        {getFileIcon(mimeType, fileName)}
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
    url: a.encryptionKey ? "" : a.url,
    thumbnailUrl: a.encryptionKey ? "" : a.thumbnailUrl,
    fileName: a.fileName,
    encrypted: !!a.encryptionKey,
  }));

  // For image viewer with encrypted images we need decrypted URLs
  // The viewer is handled via the onClose callback flow

  return (
    <div className="message-attachments">
      {images.length > 0 ? (
        <div className={`attachment-grid attachment-grid-${Math.min(images.length, 4)}`}>
          {images.map((att, i) => (
            att.encryptionKey ? (
              <EncryptedThumbnail key={att.url} att={att} index={i} onClick={setViewerIndex} />
            ) : (
              <PlainThumbnail key={att.url} att={att} index={i} onClick={setViewerIndex} />
            )
          ))}
        </div>
      ) : null}
      {files.length > 0 ? (
        <div className="attachment-file-list">
          {files.map((att) => (
            att.encryptionKey ? (
              <EncryptedAttachmentFile key={att.url} att={att} />
            ) : (
              <PlainAttachmentFile key={att.url} {...att} />
            )
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
