import { useI18n } from "../../../i18n/I18nProvider";

export function AIAssistantBadge() {
  const { t } = useI18n();

  return (
    <span className="ai-badge" title={t("ai.badge.hint")}>
      <span aria-hidden="true">🤖</span>
      {" "}{t("ai.badge.label")}
    </span>
  );
}
