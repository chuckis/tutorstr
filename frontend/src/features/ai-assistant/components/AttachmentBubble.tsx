import { useI18n } from "../../../i18n/I18nProvider";
import type { MessageAttachment } from "../../../domain/messaging";

type AttachmentBubbleProps = {
  text?: string;
  attachment: MessageAttachment;
  isStudent: boolean;
  timestamp: number;
};

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentBubble({ text, attachment, isStudent, timestamp }: AttachmentBubbleProps) {
  const { formatDateTime } = useI18n();
  const ts = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString();

  return (
    <div className={`ai-msg${isStudent ? " ai-msg-student" : ""}`}>
      {!isStudent ? <div className="ai-avatar">Ꭰh</div> : null}
      <div className="ai-bubble-wrap">
        <div className="ai-bubble ai-bubble-attach">
          <div className="ai-attach-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div>
            <div className="ai-attach-name">{attachment.fileName || "Attachment"}</div>
            {attachment.size ? <div className="ai-attach-size">{formatSize(attachment.size)}</div> : null}
          </div>
        </div>
        {text ? <div className="ai-bubble">{text}</div> : null}
        <div className="ai-msg-meta">{formatDateTime(ts)}</div>
      </div>
    </div>
  );
}
