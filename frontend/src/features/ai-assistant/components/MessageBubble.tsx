import { useI18n } from "../../../i18n/I18nProvider";

type MessageBubbleProps = {
  text: string;
  isStudent: boolean;
  timestamp: number;
};

export function MessageBubble({ text, isStudent, timestamp }: MessageBubbleProps) {
  const { formatDateTime } = useI18n();
  const ts = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString();

  return (
    <div className={`ai-msg${isStudent ? " ai-msg-student" : ""}`}>
      {!isStudent ? <div className="ai-avatar">Ꭰh</div> : null}
      <div className="ai-bubble-wrap">
        <div className="ai-bubble">
          {text}
        </div>
        <div className="ai-msg-meta">{formatDateTime(ts)}</div>
      </div>
    </div>
  );
}
