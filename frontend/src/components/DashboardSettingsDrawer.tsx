import { X } from "lucide-react";
import { useState } from "react";
import { useRelays } from "../hooks/useRelays";
import { useI18n } from "../i18n/I18nProvider";
import { AccountRole, TutorProfile } from "../hooks/hookTypes";
import { Avatar } from "./Avatar";
import { ProfileForm } from "./ProfileForm";
import { RelayConfig } from "./RelayConfig";

type DashboardSettingsDrawerProps = {
  isOpen: boolean;
  npub: string;
  profile: TutorProfile;
  onClose: () => void;
  onProfileChange: (profile: TutorProfile) => void;
  onPublishProfile: (profile: TutorProfile) => void;
  relay: ReturnType<typeof useRelays>;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
  role: AccountRole;
  onAvatarUpload?: (file: File) => Promise<void>;
  blossomUrl: string;
  onBlossomUrlChange: (url: string) => void;
};

export function DashboardSettingsDrawer({
  isOpen,
  npub,
  profile,
  onClose,
  onProfileChange,
  onPublishProfile,
  relay,
  onLogout,
  onRevealSecret,
  role,
  onAvatarUpload,
  blossomUrl,
  onBlossomUrlChange
}: DashboardSettingsDrawerProps) {
  const { t } = useI18n();
  const [revealPassphrase, setRevealPassphrase] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealedSecret, setRevealedSecret] = useState("");

  const displayName = profile.name || t("common.states.unnamedTutor");

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
    <div
      className={`dashboard-drawer-shell ${isOpen ? "open" : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
    >
      <button
        type="button"
        className="dashboard-drawer-backdrop"
        aria-label={t("profile.closeSettings")}
        onClick={onClose}
      />

      <aside
        id="dashboard-settings-drawer"
        className="dashboard-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-settings-title"
      >
        <div className="dashboard-drawer-header">
          <div>
            <p className="dashboard-eyebrow">{t("profile.settingsEyebrow")}</p>
            <h2 id="dashboard-settings-title">{t("profile.settingsTitle")}</h2>
          </div>
          <button
            type="button"
            className="ghost-action icon-only-button"
            aria-label={t("profile.closeSettings")}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="dashboard-drawer-content">
          <article className="panel dashboard-identity-card">
            <div className="dashboard-identity-card-top">
              <Avatar
                url={profile.avatarUrl}
                role={role}
                size="md"
                editable
                onChange={onAvatarUpload}
              />
              <div>
                <h3>{displayName}</h3>
                <p className="muted">{t("profile.identityHint")}</p>
              </div>
            </div>
            <p className="muted">{t("profile.npubLabel")}</p>
            <p className="identity-value">{npub}</p>
          </article>

          <article className="panel">
            <h3>{t("profile.profileSettingsTitle")}</h3>
            <ProfileForm
              profile={profile}
              onChange={onProfileChange}
              onSubmit={onPublishProfile}
              role={role}
            />
          </article>

          <article className="panel">
            <h3>{t("profile.form.blossomServerUrl")}</h3>
            <label className="filter">
              <input
                type="url"
                value={blossomUrl}
                onChange={(event) => onBlossomUrlChange(event.target.value)}
                placeholder="https://blossom.example.com"
              />
            </label>
            <p className="muted">{t("profile.form.blossomHint")}</p>
          </article>

          <RelayConfig
            relayInput={relay.relayInput}
            onRelayInputChange={relay.setRelayInput}
            relayStatus={relay.relayStatus}
            onUpdateRelays={relay.updateRelays}
          />

          <article className="panel dashboard-session-panel">
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
            {revealedSecret ? (
              <p className="identity-value">{revealedSecret}</p>
            ) : null}
            {revealError ? <p className="muted">{revealError}</p> : null}
            <button type="button" className="ghost-action" onClick={onLogout}>
              {t("common.buttons.logout")}
            </button>
          </article>
        </div>
      </aside>
    </div>
  );
}
