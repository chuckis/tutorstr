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
  onReplyTo?: (message: EncryptedMessage) => void;
};

function parseVerdict(content: string): { status: "needs_revision" | "approved"; feedback?: string; suggestions?: string[] } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "review_result" && parsed?.status === "NEED_FIX") {
      return { status: "needs_revision", feedback: parsed.feedback, suggestions: parsed.suggestions };
    }
    if (parsed?.type === "escalation" && parsed?.status === "APPROVED_BY_AI") {
      return { status: "approved", feedback: parsed.summary };
    }
    return null;
  } catch {
    return null;
  }
}

export function MessageThread({ messages, currentPubkey, resolveSenderName, assistantPubkey, onReplyTo }: MessageThreadProps) {
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
          : isAI
            ? t("ai.badge.label")
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

        const handleClick = () => {
          if (isAI && onReplyTo) onReplyTo(message);
        };
        const clickable = isAI && !!onReplyTo;

        if (isAI) {
          const verdict = parseVerdict(message.content);
          if (verdict) {
            return (
              <div
                key={message.id}
                className={`message-bubble message-received message-ai${clickable ? " message-clickable" : ""}`}
                onClick={handleClick}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
              >
                <AIAssistantBadge />
                <div className="message-content">
                  <span className={`ai-verdict-tag ${verdict.status === "needs_revision" ? "ai-verdict-tag-warn" : "ai-verdict-tag-ok"}`}>
                    {verdict.status === "needs_revision" ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M12 8v5M12 16h.01" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {verdict.status === "needs_revision" ? t("ai.panel.verdict.needsRevision") : t("ai.panel.verdict.approved")}
                  </span>
                  {verdict.feedback ? <p style={{ marginTop: 8 }}>{verdict.feedback}</p> : null}
                  {verdict.suggestions && verdict.suggestions.length > 0 ? (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {verdict.suggestions.map((s, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <span className="muted message-timestamp">
                  {senderName ? <>{senderName} · </> : null}
                  {formatDateTime(timestamp)}
                </span>
              </div>
            );
          }
        }

        return (
          <div
            key={message.id}
            className={`message-bubble ${isOwn ? "message-sent" : "message-received"}${isAI ? " message-ai" : ""}${clickable ? " message-clickable" : ""}`}
            onClick={clickable ? handleClick : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
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
