import { FormEvent, useState } from "react";

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
      setLocalError("Set a master password first.");
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setLocalError("Master passwords do not match.");
      return;
    }

    setLocalError("");
    await onCreateProfile(passphrase);
  }

  async function handleImportProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secretInput.trim()) {
      setLocalError("Paste your nsec, hex key, or seed phrase.");
      return;
    }
    if (!passphrase.trim()) {
      setLocalError("Set a master password first.");
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setLocalError("Master passwords do not match.");
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
      setLocalError("Enter your master password.");
      return;
    }

    setLocalError("");
    await onUnlock(passphrase);
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Tutorstr</p>
        <h1>Nostr tutor hub</h1>
        <p className="muted">
          Your secret key never leaves this device. We encrypt it locally before
          saving anything.
        </p>
      </section>

      {generatedNsec ? (
        <section className="auth-panel auth-warning">
          <p className="eyebrow">Save this now</p>
          <h2>Your secret key</h2>
          <p className="secret-value">{generatedNsec}</p>
          <p className="warning-text">
            Never share this. Do not lose it. We cannot recover it for you.
          </p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={(event) => setBackupConfirmed(event.target.checked)}
            />
            <span>I have saved my secret key in a safe place.</span>
          </label>
          <button
            type="button"
            onClick={onDismissGeneratedSecret}
            disabled={!backupConfirmed}
          >
            Continue to app
          </button>
        </section>
      ) : null}

      {!generatedNsec && mode === "unlock" ? (
        <section className="auth-panel">
          <h2>Unlock saved profile</h2>
          <p className="muted">
            Your profile is stored on this device. Enter the master password to
            decrypt it for this session.
          </p>
          <form className="auth-form" onSubmit={handleUnlock}>
            <label>
              Master password
              <input
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            <button type="submit">Unlock</button>
          </form>
        </section>
      ) : null}

      {!generatedNsec && mode === "welcome" ? (
        <section className="auth-panel stack">
          {flow === "choice" ? (
            <>
              <h2>Choose your start</h2>
              <div className="auth-card-grid">
                <button
                  type="button"
                  className="auth-card"
                  onClick={() => {
                    setFlow("create");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">Create new profile</span>
                  <span className="muted">
                    Generate a fresh Nostr identity in the app.
                  </span>
                </button>
                <button
                  type="button"
                  className="auth-card"
                  onClick={() => {
                    setFlow("import");
                    setLocalError("");
                  }}
                >
                  <span className="auth-card-title">I already have a key</span>
                  <span className="muted">
                    Import your `nsec`, raw hex key, or seed phrase.
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {flow === "create" ? (
            <form className="auth-form" onSubmit={handleCreateProfile}>
              <h2>Create new profile</h2>
              <p className="muted">
                Set a master password. We will encrypt your private key before
                saving it on this device.
              </p>
              <label>
                Master password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                />
              </label>
              <label>
                Confirm master password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirm}
                  onChange={(event) => setPassphraseConfirm(event.target.value)}
                />
              </label>
              <div className="auth-actions">
                <button type="submit">Generate my key</button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setFlow("choice")}
                >
                  Back
                </button>
              </div>
            </form>
          ) : null}

          {flow === "import" ? (
            <form className="auth-form" onSubmit={handleImportProfile}>
              <h2>Import existing profile</h2>
              <label>
                Secret key
                <textarea
                  className={showSecretInput ? "" : "secret-mask"}
                  rows={4}
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  placeholder="Paste your nsec, hex key, or seed phrase."
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showSecretInput}
                  onChange={(event) => setShowSecretInput(event.target.checked)}
                />
                <span>Keep input visible while typing</span>
              </label>
              <label>
                Master password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                />
              </label>
              <label>
                Confirm master password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirm}
                  onChange={(event) => setPassphraseConfirm(event.target.value)}
                />
              </label>
              <div className="auth-actions">
                <button type="submit">Import key</button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setFlow("choice")}
                >
                  Back
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
