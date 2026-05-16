import { useState } from "react";
import { AppLocale, SUPPORTED_LOCALES } from "../domain/locale";
import { useI18n } from "../i18n/I18nProvider";
import { ProfileForm } from "./ProfileForm";
import { ScheduleForm } from "./ScheduleForm";
import { RelayConfig } from "./RelayConfig";
import { TutorProfile, TutorSchedule } from "../types/nostr";
import { useRelays } from "../hooks/useRelays";

type ProfileTabProps = {
  npub: string;
  pubkey: string;
  profile: TutorProfile;
  onProfileChange: (profile: TutorProfile) => void;
  onPublishProfile: (profile: TutorProfile) => void;
  schedule: TutorSchedule;
  onScheduleChange: (schedule: TutorSchedule) => void;
  onPublishSchedule: () => void;
  relay: ReturnType<typeof useRelays>;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
  scheduleStatus: string;
  profileStatus: string;
  // lastEventId?: string;
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
  relay,
  onLogout,
  onRevealSecret,
  scheduleStatus,
  profileStatus,
  // lastEventId
}: ProfileTabProps) {
  const { t, locale, setLocale } = useI18n();
  const [revealPassphrase, setRevealPassphrase] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealedSecret, setRevealedSecret] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

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

      <article className="panel advanced-panel">
        <button
          type="button"
          className="advanced-toggle"
          aria-expanded={isAdvancedOpen}
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
        >
          <span>{t("profile.advanced")}</span>
          <span className="advanced-chevron" aria-hidden="true">
            {isAdvancedOpen ? "▲" : "▼"}
          </span>
        </button>

        {isAdvancedOpen ? (
          <div className="advanced-content">
            <article className="panel">
              <h3>{t("profile.identity")}</h3>
              <p className="muted">{t("profile.npubLabel")}</p>
              <p className="identity-value">{npub}</p>
              <p className="muted">{t("profile.pubkeyHex")}</p>
              <p className="identity-value">{pubkey}</p>
            </article>

            <RelayConfig
              relayInput={relay.relayInput}
              onRelayInputChange={relay.setRelayInput}
              relayStatus={relay.relayStatus}
              onUpdateRelays={relay.updateRelays}
            />

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
              {/* {lastEventId ? (
                <p className="muted">{t("profile.lastEvent", { id: lastEventId })}</p>
              ) : null} */}
            </article>
          </div>
        ) : null}
      </article>

      <div className="status">
        <span>{scheduleStatus || profileStatus}</span>
      </div>
    </section>
  );
}
