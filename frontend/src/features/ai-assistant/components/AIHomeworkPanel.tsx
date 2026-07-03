import { useState } from "react";
import { useI18n } from "../../../i18n/I18nProvider";
import { useAIAssistantStore } from "../store";
import { Button } from "../../../components/ui/Button";

type AIHomeworkPanelProps = {
  lessonId: string;
  studentPubkey: string;
  tutorPubkey: string;
  onSendHomework: (
    recipientPubkey: string,
    text: string,
    tutorPubkey: string,
    threadKey?: string
  ) => Promise<void>;
};

export function AIHomeworkPanel({
  lessonId,
  tutorPubkey,
  onSendHomework,
}: AIHomeworkPanelProps) {
  const { t } = useI18n();
  const { assistantPubkey } = useAIAssistantStore();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!text.trim() || !assistantPubkey) return;
    setSending(true);
    try {
      await onSendHomework(assistantPubkey, text, tutorPubkey, `lesson:${lessonId}`);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="panel">
      <h4>{t("ai.panel.title")}</h4>
      <p className="muted">{t("ai.panel.hint")}</p>
      <textarea
        className="ui-input"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("ai.panel.placeholder")}
      />
      <div className="action-buttons" style={{ marginTop: "0.5em" }}>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!text.trim() || sending || !assistantPubkey}
          loading={sending}
        >
          {t("ai.panel.send")}
        </Button>
      </div>
    </article>
  );
}
