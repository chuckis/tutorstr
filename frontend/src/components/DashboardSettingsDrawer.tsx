import { X, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Settings, User, HelpCircle, Info, ChevronRight, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useRelays } from "../hooks/useRelays";
import { useI18n } from "../i18n/I18nProvider";
import { AccountRole, UserProfile } from "../hooks/hookTypes";
import { UploadStatus } from "../hooks/useBlossomConfig";
import { Avatar } from "./Avatar";
import { ProfileForm } from "./ProfileForm";
import { RelayConfig } from "./RelayConfig";
import { SettingsFAQ } from "./SettingsFAQ";
import { SettingsAbout } from "./SettingsAbout";
import { Theme } from "../domain/theme";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Toggle } from "./ui/Toggle";

type DrawerSection = "menu" | "settings" | "profile" | "faq" | "about";

type DashboardSettingsDrawerProps = {
  isOpen: boolean;
  npub: string;
  profile: UserProfile;
  onClose: () => void;
  onProfileChange: (profile: UserProfile) => void;
  onPublishProfile: (profile: UserProfile) => void;
  relay: ReturnType<typeof useRelays>;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
  role: AccountRole;
  onAvatarUpload?: (file: File) => Promise<void>;
  blossomUrl: string;
  onBlossomUrlChange: (url: string) => void;
  uploadStatus?: UploadStatus;
  theme: Theme;
  onToggleTheme: () => void;
};

const MENU_ITEMS: { section: DrawerSection; icon: React.ReactNode; labelKey: string }[] = [
  { section: "settings", icon: <Settings size={18} />, labelKey: "profile.drawer.settings" },
  { section: "profile", icon: <User size={18} />, labelKey: "profile.drawer.profile" },
  { section: "faq", icon: <HelpCircle size={18} />, labelKey: "profile.drawer.faq" },
  { section: "about", icon: <Info size={18} />, labelKey: "profile.drawer.about" },
];

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
  onBlossomUrlChange,
  uploadStatus,
  theme,
  onToggleTheme
}: DashboardSettingsDrawerProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<DrawerSection>("menu");
  const [revealPassphrase, setRevealPassphrase] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealedSecret, setRevealedSecret] = useState("");

  const displayName = profile.name || t("common.states.unnamedTutor");
  const isSubSection = activeSection !== "menu";

  function navigateTo(section: DrawerSection) {
    setActiveSection(section);
  }

  function handleBack() {
    setActiveSection("menu");
  }

  function handleClose() {
    setActiveSection("menu");
    onClose();
  }

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

  function renderHeader() {
    if (isSubSection) {
      const sectionLabel = MENU_ITEMS.find((m) => m.section === activeSection)?.labelKey;
      return (
        <div className="dashboard-drawer-header dashboard-drawer-header--sub">
          <Button variant="ghost" className="ui-btn--icon-only settings-back-button" aria-label={t("profile.drawer.back")} onClick={handleBack}>
            <ArrowLeft size={18} aria-hidden="true" />
          </Button>
          <h2 id="dashboard-settings-title">{sectionLabel ? t(sectionLabel) : ""}</h2>
          <Button variant="ghost" className="ui-btn--icon-only" aria-label={t("profile.closeSettings")} onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
      );
    }

    return (
      <div className="dashboard-drawer-header">
        <h2 id="dashboard-settings-title">{t("profile.drawer.settings")}</h2>
        <Button variant="ghost" className="ui-btn--icon-only" aria-label={t("profile.closeSettings")} onClick={handleClose}>
            <X size={18} aria-hidden="true" />
          </Button>
      </div>
    );
  }

  function renderContent() {
    switch (activeSection) {
      case "profile":
        return (
          <>
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
              {uploadStatus?.type === "uploading" ? (
                <p className="upload-status upload-status--loading">
                  <Loader2 size={14} className="spin" aria-hidden="true" />
                  {" "}{t("profile.uploadingAvatar")}
                </p>
              ) : uploadStatus?.type === "success" ? (
                <p className="upload-status upload-status--success">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {" "}{t("profile.avatarUploaded")}
                </p>
              ) : uploadStatus?.type === "error" ? (
                <p className="upload-status upload-status--error">
                  <AlertCircle size={14} aria-hidden="true" />
                  {" "}{uploadStatus.message}
                </p>
              ) : null}
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
          </>
        );

      case "settings":
        return (
          <>
            <article className="panel">
              <h3>{t("profile.form.blossomServerUrl")}</h3>
              <Input
                type="url"
                value={blossomUrl}
                onChange={(event) => onBlossomUrlChange(event.target.value)}
                placeholder="https://blossom.example.com"
              />
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
              <Input
                label={t("profile.revealPassword")}
                type="password"
                autoComplete="current-password"
                value={revealPassphrase}
                onChange={(event) => setRevealPassphrase(event.target.value)}
              />
              <button type="button" onClick={handleRevealSecret}>
                {t("profile.revealButton")}
              </button>
              {revealedSecret ? (
                <p className="identity-value">{revealedSecret}</p>
              ) : null}
              {revealError ? <p className="muted">{revealError}</p> : null}
              <Button variant="ghost" onClick={onLogout}>
              {t("common.buttons.logout")}
            </Button>
            </article>
          </>
        );

      case "faq":
        return <SettingsFAQ />;

      case "about":
        return <SettingsAbout />;

      default:
        return (
          <>
            <nav className="settings-menu-list">
              {MENU_ITEMS.map((item) => (
                <Button variant="ghost"
                  key={item.section}
                  type="button"
                  className="settings-menu-item"
                  onClick={() => navigateTo(item.section)}
                >
                  <span className="settings-menu-item-icon">{item.icon}</span>
                  <span className="settings-menu-item-label">{t(item.labelKey)}</span>
                  <ChevronRight size={16} className="settings-menu-item-chevron" />
                </Button>
              ))}
            </nav>

            <div className="toggle-row">
              <span className="toggle-row-label">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                {" "}{t("profile.drawer.darkMode")}
              </span>
              <Toggle
                checked={theme === "dark"}
                onChange={onToggleTheme}
                aria-label={t("profile.drawer.darkMode")}
              />
            </div>
          </>
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
        onClick={handleClose}
      />

      <aside
        id="dashboard-settings-drawer"
        className="dashboard-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-settings-title"
      >
        {renderHeader()}

        <div className="dashboard-drawer-content">
          {renderContent()}
        </div>
      </aside>
    </div>
  );
}
