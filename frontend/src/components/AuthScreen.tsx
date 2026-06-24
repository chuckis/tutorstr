import { FormEvent, useState } from "react";
import { AccountRole } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Checkbox } from "./ui/Checkbox";
import { HintIcon } from "./ui/HintIcon";

type AuthScreenMode = "welcome" | "unlock" | "role-pick" | "nip07-connecting";

type Platform = "mobile" | "desktop";

export type AwaitingSigner = {
  method: "nip55" | "nip46" | "nip07";
  onCancel: () => void;
};

type AuthScreenProps = {
  mode: AuthScreenMode;
  status: string;
  generatedNsec: string;
  generatedMnemonic: string;
  platform: Platform;
  nip07ExtensionAvailable?: boolean;
  awaitingSigner: AwaitingSigner | null;
  onCreateProfile: (passphrase: string) => Promise<void>;
  onChooseRole: (role: AccountRole) => Promise<void>;
  onCancelRolePick: () => void;
  onImportProfile: (secret: string, passphrase: string) => Promise<void>;
  onUnlock: (passphrase: string) => Promise<void>;
  onDismissGeneratedSecret: () => Promise<void>;
  onConnectNip07?: () => Promise<void>;
  onConnectNip55?: () => Promise<void>;
  onConnectBunker?: (bunkerUri: string) => Promise<void>;
};

type WelcomeFlow = "choice" | "nsec" | "create" | "import";

export function AuthScreen({
  mode,
  status,
  generatedNsec,
  generatedMnemonic,
  platform,
  nip07ExtensionAvailable,
  awaitingSigner,
  onCreateProfile,
  onChooseRole,
  onCancelRolePick,
  onImportProfile,
  onUnlock,
  onDismissGeneratedSecret,
  onConnectNip07,
  onConnectNip55,
  onConnectBunker,
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
  const [bunkerInput, setBunkerInput] = useState("");
  const [nsecSpoilerOpen, setNsecSpoilerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyMnemonic() {
    try {
      await navigator.clipboard.writeText(generatedMnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

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

  async function handleConnectNip07() {
    setLocalError("");
    await onConnectNip07?.();
  }

  async function handleConnectNip55() {
    setLocalError("");
    await onConnectNip55?.();
  }

  async function handleConnectBunker() {
    if (!bunkerInput.trim()) return;
    setLocalError("");
    await onConnectBunker?.(bunkerInput.trim());
  }

  function handleBackToChoice() {
    setFlow("choice");
    setLocalError("");
  }

  const mnemonicWords = generatedMnemonic ? generatedMnemonic.split(" ") : [];

  return (
    <main className="auth-shell">
      {/* Awaiting signer overlay */}
      {awaitingSigner ? (
        <section className="auth-panel stack">
          <h2>{t("auth.connecting")}</h2>
          <p className="muted">
            {awaitingSigner.method === "nip55"
              ? t("auth.signInNip55Desc")
              : awaitingSigner.method === "nip46"
                ? t("auth.bunkerConnecting")
                : t("auth.extensionWait")}
          </p>
          <div className="auth-actions">
            <Button variant="ghost" type="button" onClick={awaitingSigner.onCancel}>
              {t("auth.cancel")}
            </Button>
          </div>
        </section>
      ) : null}

      {!awaitingSigner ? (
        <>
          <section className="auth-hero">
            <p className="eyebrow">{t("auth.heroEyebrow")}</p>
            <h1>{t("auth.heroTitle")}</h1>
            <p className="muted">{t("auth.heroBody")}</p>
          </section>

          {generatedNsec && generatedMnemonic ? (
            <section className="auth-panel auth-warning">
              <p className="eyebrow">{t("auth.saveNow")}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h2>{t("auth.mnemonicBackupTitle")}</h2>
                <HintIcon
                  hintId="nostr-key"
                  title={t("hints.nostr-key.title")}
                  content={t("hints.nostr-key.content")}
                />
              </div>
              <p className="muted">{t("auth.mnemonicBackupBody")}</p>
              <div className="mnemonic-grid">
                {mnemonicWords.map((word, index) => (
                  <div key={index} className="mnemonic-card">
                    <span className="mnemonic-index">{index + 1}</span>
                    <span className="mnemonic-word">{word}</span>
                  </div>
                ))}
              </div>
              <div className="auth-actions">
                <Button variant="secondary" type="button" onClick={handleCopyMnemonic}>
                  {copied ? t("auth.mnemonicCopied") : t("auth.mnemonicCopy")}
                </Button>
              </div>
              <details className="auth-expert-spoiler">
                <summary>{t("auth.mnemonicExpertSpoiler")}</summary>
                <p className="secret-value">{generatedNsec}</p>
              </details>
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

          {!generatedNsec && mode === "nip07-connecting" ? (
            <section className="auth-panel">
              <h2>{t("auth.connecting")}</h2>
              <p className="muted">{status || t("auth.extensionWait")}</p>
            </section>
          ) : null}

          {!generatedNsec && mode === "welcome" ? (
            <section className="auth-panel stack">
              {flow === "choice" ? (
                <>
                  <h2>{t("auth.chooseStart")}</h2>

                  {platform === "mobile" ? (
                    <>
                      <Button
                        variant="primary"
                        type="button"
                        onClick={handleConnectNip55}
                        disabled={!onConnectNip55}
                      >
                        {t("auth.signInNip55")}
                      </Button>
                    </>
                  ) : null}

                  {platform === "desktop" || nip07ExtensionAvailable ? (
                    <>
                      {nip07ExtensionAvailable ? (
                        <Button
                          variant={platform === "desktop" ? "primary" : "secondary"}
                          type="button"
                          onClick={handleConnectNip07}
                        >
                          {t("auth.signInExtension")}
                        </Button>
                      ) : platform === "desktop" ? (
                        <Button
                          variant="secondary"
                          type="button"
                          disabled
                          title={t("auth.extensionNotInstalled")}
                        >
                          {t("auth.signInExtension")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}

                  <div className="auth-divider-rule">
                    <span>{t("auth.orDivider")}</span>
                  </div>

                  <div className="auth-bunker-row">
                    <Input
                      placeholder={t("auth.bunkerPlaceholder")}
                      value={bunkerInput}
                      onChange={(event) => setBunkerInput(event.target.value)}
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleConnectBunker}
                      disabled={!bunkerInput.trim() || !onConnectBunker}
                    >
                      {t("auth.bunkerConnect")}
                    </Button>
                  </div>

                  <div className="auth-divider-rule" />

                  <button
                    type="button"
                    className="auth-spoiler-trigger"
                    onClick={() => setNsecSpoilerOpen((v) => !v)}
                  >
                    <span className={nsecSpoilerOpen ? "auth-spoiler-arrow open" : "auth-spoiler-arrow"}>
                      ▸
                    </span>
                    {t("auth.nsecSpoiler")}
                  </button>

                  {nsecSpoilerOpen ? (
                    <div className="auth-nsec-section">
                      <p className="warning-text">{t("auth.nsecWarning")}</p>
                      <p className="muted" style={{ fontSize: "0.85em", marginTop: "0.5em" }}>
                        {t("auth.betaWarning")}
                      </p>
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
                    </div>
                  ) : null}
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
                    <Button variant="ghost" onClick={handleBackToChoice}>
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
                    <Button variant="ghost" onClick={handleBackToChoice}>
                      {t("auth.back")}
                    </Button>
                  </div>
                </form>
              ) : null}

              {flow === "nsec" ? (
                <div className="auth-nsec-section">
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
                  <Button variant="ghost" onClick={handleBackToChoice}>
                    {t("auth.back")}
                  </Button>
                </div>
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
        </>
      ) : null}
    </main>
  );
}
