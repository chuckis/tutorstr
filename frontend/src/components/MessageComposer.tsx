import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";

type MessageComposerProps = {
  onSend: (text: string) => void;
};

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [text, setText] = useState("");
  const { t } = useI18n();

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
        placeholder={t("common.messages.placeholder")}
      />
      <button type="submit">{t("common.buttons.sendMessage")}</button>
    </form>
  );
}
