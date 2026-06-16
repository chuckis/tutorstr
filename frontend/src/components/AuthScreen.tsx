import { FormEvent, useState } from "react";
import { AccountRole } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Checkbox } from "./ui/Checkbox";
import { HintIcon } from "./ui/HintIcon";

type AuthScreenProps = {
  mode: "welcome" | "unlock" | "role-pick";
  status: string;
  generatedNsec: string;
  onCreateProfile: (passphrase: string) => Promise<void>;
  onChooseRole: (role: AccountRole) => Promise<void>;
  onCancelRolePick: () => void;
  onImportProfile: (secret: string, passphrase: string) => Promise<void>;
  onUnlock: (passphrase: string) => Promise<void>;
  onDismissGeneratedSecret: () => Promise<void>;
};

type WelcomeFlow = "choice" | "create" | "import";

export function AuthScreen({
  mode,
  status,
  generatedNsec,
  onCreateProfile,
  onChooseRole,
  onCancelRolePick,
  onImportProfile,
  onUnlock,
  onDismissGeneratedSecret
}: AuthScreenProps) {
  const { t } = useI18n();
  const [flow, setFlow] = useState<WelcomeFlow>("choice");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [localError, setLocalError] = useState("");
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphrase.trim()) {
      setLocalError(t("auth.errors.setPassword"));
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setLocalError(t("auth.errors.passwordMismatch"));
      return;
    }

    setLocalError("");
    setPassphrase("");
    setPassphraseConfirm("");
    await onCreateProfile(passphrase);
  }

  async function handleImportProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secretInput.trim()) {
      setLocalError(t("auth.errors.secretRequired"));
      return;
    }
    if (!passphrase.trim()) {
      setLocalError(t("auth.errors.setPassword"));
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setLocalError(t("auth.errors.passwordMismatch"));
      return;
    }

    const submittedSecret = secretInput;
    setLocalError("");
    setSecretInput("");
    setPassphrase("");
    setPassphraseConfirm("");
    await onImportProfile(submittedSecret, passphrase);
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphrase.trim()) {
      setLocalError(t("auth.errors.unlockPassword"));
      return;
    }

    setLocalError("");
    await onUnlock(passphrase);
  }

  async function handleContinueRolePick() {
    if (!selectedRole) {
      return;
    }
    setLocalError("");
    await onChooseRole(selectedRole);
  }

  function handleCancelRolePick() {
    setSelectedRole(null);
    setLocalError("");
    onCancelRolePick();
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">{t("auth.heroEyebrow")}</p>
        <h1>{t("auth.heroTitle")}</h1>
        <p className="muted">{t("auth.heroBody")}</p>
      </section>

      {generatedNsec ? (
        <section className="auth-panel auth-warning">
          <p className="eyebrow">{t("auth.saveNow")}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2>{t("auth.yourSecretKey")}</h2>
            <HintIcon
              hintId="nostr-key"
              title={t("hints.nostr-key.title")}
              content={t("hints.nostr-key.content")}
            />
          </div>
          <p className="secret-value">{generatedNsec}</p>
          <p className="warning-text">{t("auth.warning")}</p>
          <Checkbox
            label={t("auth.backupConfirmed")}
            checked={backupConfirmed}
            onChange={(event) => setBackupConfirmed(event.target.checked)}
          />
          <Button variant="primary"
            type="button"
            onClick={onDismissGeneratedSecret}
            disabled={!backupConfirmed}
          >
            {t("auth.continueToApp")}
          </Button>
        </section>
      ) : null}

      {!generatedNsec && mode === "unlock" ? (
        <section className="auth-panel">
          <h2>{t("auth.unlockTitle")}</h2>
          <p className="muted">{t("auth.unlockBody")}</p>
          <form className="auth-form" onSubmit={handleUnlock}>
            <Input
              label={t("auth.masterPassword")}
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <Button variant="secondary" type="submit">{t("auth.unlock")}</Button>
          </form>
        </section>
      ) : null}

      {!generatedNsec && mode === "welcome" ? (
        <section className="auth-panel stack">
          {flow === "choice" ? (
            <>
              <h2>{t("auth.chooseStart")}</h2>
              <div className="auth-card-grid">
                <Card
                  hoverable
                  padding="md"
                  variant="outlined"
                  onClick={() => {
                    setFlow("create");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">{t("auth.createTitle")}</span> <span className="muted">{t("auth.createBody")}</span>
                </Card>
                <Card
                  hoverable
                  padding="md"
                  variant="outlined"
                  onClick={() => {
                    setFlow("import");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">{t("auth.importTitle")}</span> <span className="muted">{t("auth.importBody")}</span>
                </Card>
              </div>
            </>
          ) : null}

          {flow === "create" ? (
            <form className="auth-form" onSubmit={handleCreateProfile}>
              <h2>{t("auth.createPanelTitle")}</h2>
              <p className="muted">{t("auth.createPanelBody")}</p>
              <Input
                label={t("auth.masterPassword")}
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <Input
                label={t("auth.confirmMasterPassword")}
                type="password"
                autoComplete="new-password"
                value={passphraseConfirm}
                onChange={(event) => setPassphraseConfirm(event.target.value)}
              />
              <div className="auth-actions">
                <Button variant="primary" type="submit">{t("auth.generateKey")}</Button>
                <Button variant="ghost" onClick={() => setFlow("choice")}>
          {t("auth.back")}
        </Button>
              </div>
            </form>
          ) : null}

          {flow === "import" ? (
            <form className="auth-form" onSubmit={handleImportProfile}>
              <h2>{t("auth.importPanelTitle")}</h2>
              <Textarea
                label={t("auth.secretKey")}
                className={showSecretInput ? "" : "secret-mask"}
                rows={4}
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                placeholder={t("auth.secretPlaceholder")}
              />
              <Checkbox
                label={t("auth.showInput")}
                checked={showSecretInput}
                onChange={(event) => setShowSecretInput(event.target.checked)}
              />
              <Input
                label={t("auth.masterPassword")}
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <Input
                label={t("auth.confirmMasterPassword")}
                type="password"
                autoComplete="new-password"
                value={passphraseConfirm}
                onChange={(event) => setPassphraseConfirm(event.target.value)}
              />
              <div className="auth-actions">
                <Button variant="primary" type="submit">{t("auth.importKey")}</Button>
                <Button variant="ghost" onClick={() => setFlow("choice")}>
          {t("auth.back")}
        </Button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {!generatedNsec && mode === "role-pick" ? (
        <section className="auth-panel stack">
          <h2>{t("account.rolePick.title")}</h2>
          <p className="muted">{t("account.rolePick.body")}</p>
          <div className="auth-card-grid">
            <Card
              hoverable
              padding="md"
              variant="outlined"
              aria-pressed={selectedRole === "tutor"}
              onClick={() => setSelectedRole("tutor")}
            >
              <span className="auth-card-title">{t("account.rolePick.tutorTitle")}</span> <span className="muted">{t("account.rolePick.tutorBody")}</span>
            </Card>
            <Card
              hoverable
              padding="md"
              variant="outlined"
              aria-pressed={selectedRole === "student"}
              onClick={() => setSelectedRole("student")}
            >
              <span className="auth-card-title">{t("account.rolePick.studentTitle")}</span> <span className="muted">{t("account.rolePick.studentBody")}</span>
            </Card>
          </div>
          <div className="auth-actions">
            <Button variant="secondary"
              type="button"
              onClick={handleContinueRolePick}
              disabled={!selectedRole}
            >
              {t("account.rolePick.continue")}
            </Button>
            <Button variant="ghost" onClick={handleCancelRolePick}>
              {t("auth.back")}
            </Button>
          </div>
        </section>
      ) : null}

      {localError || status ? (
        <p className="auth-status">{localError || status}</p>
      ) : null}
    </main>
  );
}
