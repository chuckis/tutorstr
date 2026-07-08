import { useRef, useEffect } from "react";
import type { EncryptedMessage } from "../../../domain/messaging";
import { useI18n } from "../../../i18n/I18nProvider";
import { MessageBubble } from "./MessageBubble";
import { AttachmentBubble } from "./AttachmentBubble";
import { VerdictBubble } from "./VerdictBubble";
import { TypingIndicator } from "./TypingIndicator";
import { AIAssistantBadge } from "./AIAssistantBadge";

type ChatThreadProps = {
  messages: EncryptedMessage[];
  studentPubkey: string;
  assistantPubkey: string | null;
  isAwaitingAssistant: boolean;
};

function parseVerdict(content: string): { status: "needs_revision" | "approved"; issues?: { summary: string; hint?: string }[]; feedback?: string } | null {
  try {
    const parsed = JSON.parse(content);

    if (parsed.type === "review_result" && parsed.status === "NEED_FIX") {
      return {
        status: "needs_revision",
        feedback: parsed.feedback,
        issues: (parsed.suggestions || []).map((s: string) => ({ summary: s })),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function ChatThread({ messages, studentPubkey, assistantPubkey, isAwaitingAssistant }: ChatThreadProps) {
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isAwaitingAssistant]);

  if (messages.length === 0 && !isAwaitingAssistant) {
    return (
      <div className="ai-thread ai-thread-empty">
        <div className="ai-welcome">
          <div className="ai-avatar" style={{ width: 40, height: 40, fontSize: 18 }}>Ꭰh</div>
          <p>{t("ai.panel.hint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-thread">
      {messages.map((msg) => {
        const isStudent = msg.pubkey === studentPubkey;
        const isAssistant = assistantPubkey && msg.pubkey === assistantPubkey;

        if (isStudent) {
          if (msg.attachments && msg.attachments.length > 0) {
            return (
              <AttachmentBubble
                key={msg.id}
                text={msg.content || undefined}
                attachment={msg.attachments[0]}
                isStudent
                timestamp={msg.created_at}
              />
            );
          }
          return (
            <MessageBubble
              key={msg.id}
              text={msg.content}
              isStudent
              timestamp={msg.created_at}
            />
          );
        }

        if (isAssistant) {
          const verdict = parseVerdict(msg.content);
          if (verdict) {
            return (
              <div key={msg.id}>
                <AIAssistantBadge />
                <VerdictBubble
                  status={verdict.status}
                  issues={verdict.issues}
                  feedback={verdict.feedback}
                  timestamp={msg.created_at}
                />
              </div>
            );
          }

          if (msg.attachments && msg.attachments.length > 0) {
            return (
              <div key={msg.id}>
                <AIAssistantBadge />
                <AttachmentBubble
                  text={msg.content || undefined}
                  attachment={msg.attachments[0]}
                  isStudent={false}
                  timestamp={msg.created_at}
                />
              </div>
            );
          }
          return (
            <div key={msg.id}>
              <AIAssistantBadge />
              <MessageBubble
                text={msg.content}
                isStudent={false}
                timestamp={msg.created_at}
              />
            </div>
          );
        }

        return null;
      })}
      {isAwaitingAssistant ? <TypingIndicator /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
