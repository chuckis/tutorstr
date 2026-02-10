import { useState } from "react";

type MessageComposerProps = {
  onSend: (text: string) => void;
};

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [text, setText] = useState("");

  return (
    <form
      className="message-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(text);
        setText("");
      }}
    >
      <textarea
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a private message..."
      />
      <button type="submit">Send message</button>
    </form>
  );
}
