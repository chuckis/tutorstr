import { AppLocale, SUPPORTED_LOCALES } from "../domain/locale";
import { useI18n } from "../i18n/I18nProvider";

type RelayConfigProps = {
  relayInput: string;
  onRelayInputChange: (value: string) => void;
  relayStatus: string;
  onUpdateRelays: () => void;
};

export function RelayConfig({
  relayInput,
  onRelayInputChange,
  relayStatus,
  onUpdateRelays,
}: RelayConfigProps) {
  const { t, locale, setLocale } = useI18n();

  return (
    <article className="panel">
      <h3>{t("profile.relayConfig")}</h3>
      <label className="filter">
        {t("common.language.label")}
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as AppLocale)}
        >
          {SUPPORTED_LOCALES.map((entry) => (
            <option key={entry} value={entry}>
              {t(`common.language.${entry}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="filter">
        {t("profile.relaysLabel")}
        <textarea
          rows={3}
          value={relayInput}
          onChange={(event) => onRelayInputChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={onUpdateRelays}>
        {t("profile.saveRelays")}
      </button>
      {relayStatus ? <p className="muted">{relayStatus}</p> : null}
    </article>
  );
}