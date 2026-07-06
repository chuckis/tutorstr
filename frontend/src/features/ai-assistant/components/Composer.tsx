import { useState, useRef, useCallback } from "react";
import { useI18n } from "../../../i18n/I18nProvider";
import { AttachmentPreviewChip } from "./AttachmentPreviewChip";
import { QuickChipsRow } from "./QuickChipsRow";

type ComposerProps = {
  onSend: (text: string, attachment?: File) => Promise<void>;
  disabled: boolean;
  onOpenTutorChat: () => void;
};

export function Composer({ onSend, disabled, onOpenTutorChat }: ComposerProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = text.trim().length > 0 || attachment !== null;
  const canSend = hasContent && !disabled && !sending;

  const handleSubmit = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(text, attachment ?? undefined);
      setText("");
      setAttachment(null);
    } finally {
      setSending(false);
    }
  }, [canSend, onSend, text, attachment]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      e.target.value = "";
    }
  }, []);

  const chips = [
    { label: t("ai.panel.retrySubmit"), onClick: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="ai-composer">
      {attachment ? (
        <AttachmentPreviewChip
          name={attachment.name}
          sizeBytes={attachment.size}
          onRemove={() => setAttachment(null)}
        />
      ) : null}

      <QuickChipsRow chips={chips} />

      <div className="ai-composer-row">
        <button
          type="button"
          className="ai-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Attach file"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5V17a4 4 0 01-4 4H8a5 5 0 01-5-5V8a4 4 0 014-4h5.5a3 3 0 013 3v7a2 2 0 01-2 2H10a1.5 1.5 0 010-3h4.5" />
          </svg>
        </button>
        <textarea
          className="ai-text-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ai.panel.placeholder")}
          disabled={disabled || sending}
        />
        <button
          type="button"
          className={`ai-send-btn${canSend ? " ai-send-btn-enabled" : ""}`}
          onClick={handleSubmit}
          disabled={!canSend}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="ai-file-input"
        onChange={handleFileSelect}
        hidden
      />
    </div>
  );
}
