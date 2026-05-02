import { useState } from "react";
import { AppLocale, SUPPORTED_LOCALES } from "../domain/locale";
import { useI18n } from "../i18n/I18nProvider";
import { ProfileForm } from "./ProfileForm";
import { ScheduleForm } from "./ScheduleForm";
import { TutorProfile, TutorSchedule } from "../types/nostr";

type ProfileTabProps = {
  npub: string;
  pubkey: string;
  profile: TutorProfile;
  onProfileChange: (profile: TutorProfile) => void;
  onPublishProfile: () => void;
  schedule: TutorSchedule;
  onScheduleChange: (schedule: TutorSchedule) => void;
  onPublishSchedule: () => void;
  relayInput: string;
  onRelayInputChange: (value: string) => void;
  relayStatus: string;
  onUpdateRelays: () => void;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
  scheduleStatus: string;
  profileStatus: string;
  lastEventId?: string;
};

export function ProfileTab({
  npub,
  pubkey,
  profile,
  onProfileChange,
  onPublishProfile,
  schedule,
  onScheduleChange,
  onPublishSchedule,
  relayInput,
  onRelayInputChange,
  relayStatus,
  onUpdateRelays,
  onLogout,
  onRevealSecret,
  scheduleStatus,
  profileStatus,
  lastEventId
}: ProfileTabProps) {
  const { t, locale, setLocale } = useI18n();
  const [revealPassphrase, setRevealPassphrase] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealedSecret, setRevealedSecret] = useState("");

  async function handleRevealSecret() {
    try {
      const nsec = await onRevealSecret(revealPassphrase);
      setRevealError("");
      setRevealedSecret(nsec);
      setRevealPassphrase("");
    } catch (error) {
      setRevealError(
        error instanceof Error ? error.message : t("profile.revealButton")
      );
    }
  }

  return (
    <section className="tab-panel profile-tab">
      <article className="panel">
        <h3>{t("profile.identity")}</h3>
        <p className="muted">{t("profile.npubLabel")}</p>
        <p className="identity-value">{npub}</p>
        <p className="muted">{t("profile.pubkeyHex")}</p>
        <p className="identity-value">{pubkey}</p>
      </article>

      <ProfileForm
        profile={profile}
        onChange={onProfileChange}
        onSubmit={onPublishProfile}
      />
      <ScheduleForm
        schedule={schedule}
        onChange={onScheduleChange}
        onSubmit={onPublishSchedule}
      />

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

      <article className="panel">
        <h3>{t("profile.session")}</h3>
        <label className="filter">
          {t("profile.revealPassword")}
          <input
            type="password"
            autoComplete="current-password"
            value={revealPassphrase}
            onChange={(event) => setRevealPassphrase(event.target.value)}
          />
        </label>
        <button type="button" onClick={handleRevealSecret}>
          {t("profile.revealButton")}
        </button>
        {revealedSecret ? <p className="identity-value">{revealedSecret}</p> : null}
        {revealError ? <p className="muted">{revealError}</p> : null}
        <button type="button" className="ghost-action" onClick={onLogout}>
          {t("common.buttons.logout")}
        </button>
      </article>

      <div className="status">
        <span>{scheduleStatus || profileStatus}</span>
        {lastEventId ? (
          <span className="muted">{t("profile.lastEvent", { id: lastEventId })}</span>
        ) : null}
      </div>
    </section>
  );
}
