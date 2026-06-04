import { useI18n } from "../i18n/I18nProvider";

export function SettingsAbout() {
  const { t } = useI18n();

  return (
    <div className="settings-article">
      <h3>{t("profile.about.title")}</h3>
      <p>{t("profile.about.description")}</p>
      <dl className="settings-about-dl">
        <dt>{t("profile.about.version")}</dt>
        <dd>0.1.0 (MVP)</dd>
        <dt>{t("profile.about.builtOn")}</dt>
        <dd>
          <a
            href="https://nostr.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nostr
          </a>
        </dd>
        <dt>{t("profile.about.sourceCode")}</dt>
        <dd>
          <a
            href="https://github.com/chuckis/tutorstr"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </dd>
      </dl>
    </div>
  );
}
