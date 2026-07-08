import { X, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Settings, User, HelpCircle, Info, ChevronRight, Moon, Sun, Ban, Copy, Check, Bot } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useRelays } from "../hooks/useRelays";
import { useI18n } from "../i18n/I18nProvider";
import { AccountRole, UserProfile } from "../hooks/hookTypes";
import type { ExportedSecret } from "../application/auth/exportSecretKey";
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
import { BlockedUsersList } from "./BlockedUsersList";
import { useAIAssistantStore } from "../features/ai-assistant/store";
import { nostrClient } from "../nostr/client";

type DrawerSection = "menu" | "settings" | "profile" | "faq" | "about" | "blocked" | "ai";

type DashboardSettingsDrawerProps = {
  isOpen: boolean;
  npub: string;
  pubkey: string;
  profile: UserProfile;
  onClose: () => void;
  onProfileChange: (profile: UserProfile) => void;
  onPublishProfile: (profile: UserProfile) => void;
  relay: ReturnType<typeof useRelays>;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<ExportedSecret>;
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
  { section: "blocked", icon: <Ban size={18} />, labelKey: "profile.drawer.blocked" },
  { section: "ai", icon: <Bot size={18} />, labelKey: "profile.drawer.ai" },
  { section: "faq", icon: <HelpCircle size={18} />, labelKey: "profile.drawer.faq" },
  { section: "about", icon: <Info size={18} />, labelKey: "profile.drawer.about" },
];

export function DashboardSettingsDrawer({
  isOpen,
  npub,
  pubkey,
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
  onToggleTheme,
}: DashboardSettingsDrawerProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<DrawerSection>("menu");
  const [revealPassphrase, setRevealPassphrase] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<ExportedSecret | null>(null);
  const [copied, setCopied] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

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
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  }

  async function handleRevealSecret() {
    try {
      const secret = await onRevealSecret(revealPassphrase);
      setRevealError("");
      setRevealedSecret(secret);
      setRevealPassphrase("");
      setCopied(false);
      setExpertOpen(false);
    } catch (error) {
      setRevealError(
        error instanceof Error ? error.message : t("profile.revealButton")
      );
    }
  }

  async function handleCopyMnemonic() {
    if (!revealedSecret?.mnemonic) return;
    try {
      await navigator.clipboard.writeText(revealedSecret.mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  const mnemonicWords = revealedSecret?.mnemonic ? revealedSecret.mnemonic.split(" ") : [];

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
              relays={relay.relays}
              relayInput={relay.relayInput}
              onRelayInputChange={relay.setRelayInput}
              relayStatus={relay.relayStatus}
              onAddRelay={relay.addRelay}
              onRemoveRelay={relay.removeRelay}
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
              {revealedSecret?.mnemonic ? (
                <div className="mnemonic-grid">
                  {mnemonicWords.map((word, index) => (
                    <div key={index} className="mnemonic-card">
                      <span className="mnemonic-index">{index + 1}</span>
                      <span className="mnemonic-word">{word}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {revealedSecret?.mnemonic ? (
                <div className="auth-actions" style={{ marginTop: "0.5em" }}>
                  <Button variant="secondary" type="button" onClick={handleCopyMnemonic}>
                    {copied ? (
                      <><Check size={14} /> {t("auth.mnemonicCopied")}</>
                    ) : (
                      <><Copy size={14} /> {t("auth.mnemonicCopy")}</>
                    )}
                  </Button>
                </div>
              ) : null}
              <details
                className="auth-expert-spoiler"
                open={expertOpen}
                onToggle={(e) => setExpertOpen(e.currentTarget.open)}
              >
                <summary>{t("auth.mnemonicExpertSpoiler")}</summary>
                {revealedSecret ? (
                  <p className="identity-value">{revealedSecret.nsec}</p>
                ) : null}
              </details>
              {revealError ? <p className="muted">{revealError}</p> : null}
              <Button variant="ghost" onClick={onLogout}>
              {t("common.buttons.logout")}
            </Button>
            </article>
          </>
        );

      case "blocked":
        return <BlockedUsersList pubkey={pubkey} viewerRole={role} />;

      case "faq":
        return <SettingsFAQ />;

      case "about":
        return <SettingsAbout />;

      case "ai":
        return <AISettingsPanel />;

      default:
        return (
          <>
            <nav className="settings-menu-list">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  className="ui-btn ui-btn--ghost ui-btn--md settings-menu-item"
                  onClick={() => navigateTo(item.section)}
                >
                  <span className="settings-menu-item-icon">{item.icon}</span>
                  <span className="settings-menu-item-label">{t(item.labelKey)}</span>
                  <ChevronRight size={16} className="settings-menu-item-chevron" />
                </button>
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
      inert={!isOpen ? true : undefined}
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

function AISettingsPanel() {
  const { t } = useI18n();
  const {
    isEnabled,
    assistantPubkey,
    isAvailable,
    checkedAt,
    setEnabled,
    setPubkey,
    setAvailable,
  } = useAIAssistantStore();
  const [checking, setChecking] = useState(false);

  const pingBot = useCallback(async (pubkey: string) => {
    if (!pubkey) return;
    console.log("[AISettings] pingBot checking", pubkey.slice(0, 8) + "..");
    setChecking(true);
    try {
      const online = await new Promise<boolean>((resolve) => {
        let resolved = false;
        const unsub = nostrClient.subscribe(
          { kinds: [0], authors: [pubkey], limit: 1 },
          () => {
            if (resolved) return;
            console.log("[AISettings] kind:0 event received — bot is online");
            resolved = true;
            clearTimeout(timer);
            unsub();
            resolve(true);
          },
        );
        const timer = setTimeout(() => {
          if (resolved) return;
          console.log("[AISettings] timeout 60s — bot is offline");
          resolved = true;
          unsub();
          resolve(false);
        }, 60000);
      });
      console.log("[AISettings] pingBot result:", online);
      setAvailable(online);
    } catch (err) {
      console.error("[AISettings] pingBot error:", err);
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  }, [setAvailable]);

  useEffect(() => {
    if (!isEnabled || !assistantPubkey) {
      if (isAvailable !== false) setAvailable(false);
      return;
    }
    const since = checkedAt ?? 0;
    if (Date.now() - since > 30000) {
      pingBot(assistantPubkey);
    }
  }, [isEnabled, assistantPubkey, pingBot, setAvailable]);

  function handleToggle(v: boolean) {
    setEnabled(v);
    if (v && assistantPubkey) {
      pingBot(assistantPubkey);
    }
  }

  const statusIcon = checking
    ? <Loader2 size={14} className="spin" />
    : isAvailable
      ? <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
      : <AlertCircle size={14} style={{ color: "var(--color-danger)" }} />;

  const statusText = checking
    ? t("ai.settings.status.checking")
    : isAvailable
      ? t("ai.settings.status.available")
      : t("ai.settings.status.unavailable");

  return (
    <article className="panel">
      <h3>{t("ai.settings.title")}</h3>

      <div className="toggle-row">
        <span className="toggle-row-label">{t("ai.settings.enable")}</span>
        <Toggle
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          aria-label={t("ai.settings.enable")}
        />
      </div>

      {isEnabled ? (
        <>
          <div style={{ marginTop: "1em" }}>
            <Input
              label={t("ai.settings.pubkey")}
              type="text"
              value={assistantPubkey ?? ""}
              onChange={(e) => {
                setPubkey(e.target.value);
                if (e.target.value) pingBot(e.target.value);
              }}
              placeholder="npub1... or hex"
            />
          </div>

          <p className="muted" style={{ marginTop: "0.5em", display: "flex", alignItems: "center", gap: 6 }}>
            {statusIcon}
            {" "}{statusText}
          </p>
        </>
      ) : null}
    </article>
  );
}
