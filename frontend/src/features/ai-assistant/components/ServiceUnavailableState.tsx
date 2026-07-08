import { useI18n } from "../../../i18n/I18nProvider";

type ServiceUnavailableStateProps = {
  onOpenTutorChat: () => void;
};

export function ServiceUnavailableState({ onOpenTutorChat }: ServiceUnavailableStateProps) {
  const { t } = useI18n();

  return (
    <div className="ai-unavailable">
      <div className="ai-unavailable-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </div>
      <div className="ai-unavailable-title">{t("ai.panel.unavailable.title")}</div>
      <div className="ai-unavailable-body">{t("ai.panel.unavailable.body")}</div>
      <button type="button" className="ai-btn" onClick={onOpenTutorChat}>
        {t("ai.panel.unavailable.cta")}
      </button>
    </div>
  );
}
