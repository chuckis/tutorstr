import { EncryptedMessage } from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";

const MAX_MESSAGES = 6;

type MessageThreadProps = {
  messages: EncryptedMessage[];
};

export function MessageThread({ messages }: MessageThreadProps) {
  const { t, formatDateTime } = useI18n();

  if (messages.length === 0) {
    return <p className="muted">{t("common.messages.empty")}</p>;
  }

  const visible = messages.slice(-MAX_MESSAGES);

  return (
    <div className="message-thread">
      {visible.map((message) => (
        <div key={message.id} className="message-bubble">
          <p>{message.content}</p>
          <span className="muted">
            {formatDateTime(new Date(message.created_at * 1000).toISOString())}
          </span>
        </div>
      ))}
    </div>
  );
}
