import { useI18n } from "../../../i18n/I18nProvider";

export function TypingIndicator() {
  const { t } = useI18n();

  return (
    <div className="ai-msg">
      <div className="ai-avatar">Ꭰh</div>
      <div>
        <div className="ai-typing-bubble">
          <span /><span /><span />
        </div>
        <div className="ai-typing-note">{t("ai.panel.checking")}</div>
      </div>
    </div>
  );
}
