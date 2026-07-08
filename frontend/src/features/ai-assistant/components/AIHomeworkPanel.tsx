import { useState, useCallback, useEffect, useRef } from "react";
import { useI18n } from "../../../i18n/I18nProvider";
import type { EncryptedMessage } from "../../../domain/messaging";
import type { AccountRole } from "../../../domain/account";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";
import { ServiceUnavailableState } from "./ServiceUnavailableState";

type AIHomeworkPanelProps = {
  lessonId: string;
  messages: EncryptedMessage[];
  assistantPubkey: string | null;
  tutorPubkey: string;
  studentPubkey: string;
  isServiceAvailable: boolean;
  onSendHomework: (text: string, attachment?: File) => Promise<void>;
  onOpenTutorChat: () => void;
  viewerRole: AccountRole;
};

export function AIHomeworkPanel({
  lessonId,
  messages,
  assistantPubkey,
  isServiceAvailable,
  studentPubkey,
  onSendHomework,
  onOpenTutorChat,
  viewerRole,
}: AIHomeworkPanelProps) {
  const { t } = useI18n();
  const [isAwaiting, setIsAwaiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMsgCount = useRef(messages.length);

  const clearWait = useCallback(() => {
    setIsAwaiting(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (assistantPubkey && lastMsg.pubkey === assistantPubkey) {
        clearWait();
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, assistantPubkey, clearWait]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSend = useCallback(async (text: string, attachment?: File) => {
    setIsAwaiting(true);
    try {
      await onSendHomework(text, attachment);
      timeoutRef.current = setTimeout(() => {
        setIsAwaiting(false);
      }, 12000);
    } catch {
      setIsAwaiting(false);
    }
  }, [onSendHomework]);

  if (!isServiceAvailable) {
    return (
      <article className="panel">
        <h4>{t("ai.panel.title")}</h4>
        <ServiceUnavailableState onOpenTutorChat={onOpenTutorChat} />
      </article>
    );
  }

  return (
    <article className="panel ai-panel">
      <div className="ai-panel-header">
        <div className="ai-avatar">Ꭰh</div>
        <div className="ai-panel-title">
          <h4>{t("ai.panel.title")}</h4>
        </div>
      </div>

      <ChatThread
        messages={messages}
        studentPubkey={studentPubkey}
        assistantPubkey={assistantPubkey}
        isAwaitingAssistant={isAwaiting}
      />

      <Composer
        onSend={handleSend}
        disabled={isAwaiting}
        onOpenTutorChat={onOpenTutorChat}
      />
    </article>
  );
}
