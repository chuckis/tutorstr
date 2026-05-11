import { FormEvent, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";

type AuthScreenProps = {
  mode: "welcome" | "unlock";
  status: string;
  generatedNsec: string;
  onCreateProfile: (passphrase: string) => Promise<void>;
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
          <h2>{t("auth.yourSecretKey")}</h2>
          <p className="secret-value">{generatedNsec}</p>
          <p className="warning-text">{t("auth.warning")}</p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={(event) => setBackupConfirmed(event.target.checked)}
            />
            <span>{t("auth.backupConfirmed")}</span>
          </label>
          <button
            type="button"
            onClick={onDismissGeneratedSecret}
            disabled={!backupConfirmed}
          >
            {t("auth.continueToApp")}
          </button>
        </section>
      ) : null}

      {!generatedNsec && mode === "unlock" ? (
        <section className="auth-panel">
          <h2>{t("auth.unlockTitle")}</h2>
          <p className="muted">{t("auth.unlockBody")}</p>
          <form className="auth-form" onSubmit={handleUnlock}>
            <label>
              {t("auth.masterPassword")}
              <input
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            <button type="submit">{t("auth.unlock")}</button>
          </form>
        </section>
      ) : null}

      {!generatedNsec && mode === "welcome" ? (
        <section className="auth-panel stack">
          {flow === "choice" ? (
            <>
              <h2>{t("auth.chooseStart")}</h2>
              <div className="auth-card-grid">
                <button
                  type="button"
                  className="auth-card"
                  onClick={() => {
                    setFlow("create");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">{t("auth.createTitle")}</span>
                  <span className="muted">{t("auth.createBody")}</span>
                </button>
                <button
                  type="button"
                  className="auth-card"
                  onClick={() => {
                    setFlow("import");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">{t("auth.importTitle")}</span>
                  <span className="muted">{t("auth.importBody")}</span>
                </button>
              </div>
            </>
          ) : null}

          {flow === "create" ? (
            <form className="auth-form" onSubmit={handleCreateProfile}>
              <h2>{t("auth.createPanelTitle")}</h2>
              <p className="muted">{t("auth.createPanelBody")}</p>
              <label>
                {t("auth.masterPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                />
              </label>
              <label>
                {t("auth.confirmMasterPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirm}
                  onChange={(event) => setPassphraseConfirm(event.target.value)}
                />
              </label>
              <div className="auth-actions">
                <button type="submit">{t("auth.generateKey")}</button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setFlow("choice")}
                >
                  {t("auth.back")}
                </button>
              </div>
            </form>
          ) : null}

          {flow === "import" ? (
            <form className="auth-form" onSubmit={handleImportProfile}>
              <h2>{t("auth.importPanelTitle")}</h2>
              <label>
                {t("auth.secretKey")}
                <textarea
                  className={showSecretInput ? "" : "secret-mask"}
                  rows={4}
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  placeholder={t("auth.secretPlaceholder")}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showSecretInput}
                  onChange={(event) => setShowSecretInput(event.target.checked)}
                />
                <span>{t("auth.showInput")}</span>
              </label>
              <label>
                {t("auth.masterPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                />
              </label>
              <label>
                {t("auth.confirmMasterPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirm}
                  onChange={(event) => setPassphraseConfirm(event.target.value)}
                />
              </label>
              <div className="auth-actions">
                <button type="submit">{t("auth.importKey")}</button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setFlow("choice")}
                >
                  {t("auth.back")}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {localError || status ? (
        <p className="auth-status">{localError || status}</p>
      ) : null}
    </main>
  );
}
