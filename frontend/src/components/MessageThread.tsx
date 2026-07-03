import { useRef, useEffect, useCallback, useState } from "react";
import { EncryptedMessage } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { Button } from "./ui/Button";
import { AIAssistantBadge } from "../features/ai-assistant/components/AIAssistantBadge";

const PAGE_SIZE = 20;

type MessageThreadProps = {
  messages: EncryptedMessage[];
  currentPubkey?: string;
  resolveSenderName?: (pubkey: string) => string;
  assistantPubkey?: string | null;
};

export function MessageThread({ messages, currentPubkey, resolveSenderName, assistantPubkey }: MessageThreadProps) {
  const { t, formatDateTime } = useI18n();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.slice(-visibleCount);
  const hasMore = messages.length > visibleCount;

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  if (messages.length === 0) {
    return <p className="muted">{t("common.messages.empty")}</p>;
  }

  return (
    <div className="message-thread" ref={containerRef}>
      {hasMore ? (
        <Button variant="ghost"
          type="button"
          className="load-more"
          onClick={loadMore}
        >
          {t("common.messages.loadMore", { count: messages.length - visibleCount })}
        </Button>
      ) : null}
      {visibleMessages.map((message) => {
        const isOwn = message.pubkey === currentPubkey;
        const isAI = !isOwn && assistantPubkey && message.pubkey === assistantPubkey;
        const senderName = isOwn
          ? t("common.messages.you")
          : resolveSenderName?.(message.pubkey);

        let timestamp: string;
        try {
          const ms = Number.isFinite(message.created_at) && message.created_at > 0
            ? message.created_at * 1000
            : Date.now();
          timestamp = new Date(ms).toISOString();
        } catch {
          timestamp = new Date().toISOString();
        }

        return (
          <div
            key={message.id}
            className={`message-bubble ${isOwn ? "message-sent" : "message-received"}${isAI ? " message-ai" : ""}`}
          >
            {isAI ? <AIAssistantBadge /> : null}
            <div className="message-content">
              {message.content ? <p>{message.content}</p> : null}
              <MessageAttachmentPreview attachments={message.attachments} />
            </div>
            <span className="muted message-timestamp">
              {senderName ? <>{senderName} · </> : null}
              {formatDateTime(timestamp)}
            </span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
