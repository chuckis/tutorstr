import { EncryptedMessage } from "../types/nostr";

const MAX_MESSAGES = 6;

type MessageThreadProps = {
  messages: EncryptedMessage[];
};

export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) {
    return <p className="muted">No messages yet.</p>;
  }

  const visible = messages.slice(-MAX_MESSAGES);

  return (
    <div className="message-thread">
      {visible.map((message) => (
        <div key={message.id} className="message-bubble">
          <p>{message.content}</p>
          <span className="muted">{new Date(message.created_at * 1000).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
