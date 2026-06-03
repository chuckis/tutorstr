import { useEffect, useMemo, useState } from "react";
import { createNewProfile } from "../application/auth/createNewProfile";
import { exportSecretKey } from "../application/auth/exportSecretKey";
import { importExistingKey } from "../application/auth/importExistingKey";
import { logout as logoutUseCase } from "../application/auth/logout";
import { restoreStoredSession } from "../application/auth/restoreStoredSession";
import { saveGeneratedProfile } from "../application/auth/saveGeneratedProfile";
import { unlockVault } from "../application/auth/unlockVault";
import { AccountRole } from "../domain/account";
import { AuthError, AuthSession } from "../domain/auth";
import { useI18n } from "../i18n/I18nProvider";
import { AuthVaultRepository } from "../ports/authVaultRepository";
import { VaultCipher } from "../ports/vaultCipher";
import { NostrKeyMaterial } from "../ports/nostrKeyMaterial";
import { NostrSigner } from "../ports/nostrSigner";
import { SignerManager } from "../ports/signerManager";

type AuthMode = "loading" | "welcome" | "unlock" | "role-pick" | "authenticated";

type PendingGeneratedProfile = {
  secretKeyHex: string;
  passphrase: string;
  session: AuthSession;
};

type PendingRolePick = {
  passphrase: string;
};

type AuthDependencies = {
  vaultRepository: AuthVaultRepository;
  vaultCipher: VaultCipher;
  keyMaterial: NostrKeyMaterial;
  signerManager: SignerManager;
};

type SignerFactory = (
  session: AuthSession,
  passphrase: string
) => NostrSigner;

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

export function useAuthController(
  authDeps: AuthDependencies,
  createSigner: SignerFactory
) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState("");
  const [generatedNsec, setGeneratedNsec] = useState("");
  const [pendingGeneratedProfile, setPendingGeneratedProfile] =
    useState<PendingGeneratedProfile | null>(null);
  const [pendingRolePick, setPendingRolePick] = useState<PendingRolePick | null>(null);

  useEffect(() => {
    const restored = restoreStoredSession(authDeps.vaultRepository);
    if (!restored) {
      authDeps.signerManager.setSigner(null);
      setSession(null);
      setMode("welcome");
      return;
    }

    setSession(restored);
    setMode("unlock");
  }, [authDeps.signerManager, authDeps.vaultRepository]);

  const isAuthenticated = mode === "authenticated" && session !== null;

  const actions = useMemo(
    () => ({
      async createProfile(passphrase: string) {
        setStatus("");
        setPendingRolePick({ passphrase });
        setMode("role-pick");
      },
      async chooseRole(role: AccountRole) {
        if (!pendingRolePick) {
          return;
        }

        setStatus(t("auth.createTitle"));

        try {
          const result = await createNewProfile(authDeps, {
            passphrase: pendingRolePick.passphrase,
            role
          });
          setGeneratedNsec(result.nsec);
          setPendingGeneratedProfile({
            secretKeyHex: result.secretKeyHex,
            passphrase: pendingRolePick.passphrase,
            session: result.session
          });
          setPendingRolePick(null);
          setMode("welcome");
          setStatus("");
        } catch (error) {
          setStatus(toLocalizedErrorMessage(error, t) || t("auth.createTitle"));
        }
      },
      cancelRolePick() {
        setPendingRolePick(null);
        setStatus("");
        setMode("welcome");
      },
      async importProfile(secret: string, passphrase: string) {
        setStatus(t("auth.importPanelTitle"));

        try {
          const nextSession = await importExistingKey(authDeps, {
            secret,
            passphrase
          });
          const signer = createSigner(nextSession, passphrase);
          authDeps.signerManager.setSigner(signer);
          setGeneratedNsec("");
          setSession(nextSession);
          setMode("authenticated");
          setStatus("");
        } catch (error) {
          setStatus(toLocalizedErrorMessage(error, t) || t("auth.importTitle"));
        }
      },
      async unlock(passphrase: string) {
        setStatus(t("auth.unlockTitle"));

        try {
          const nextSession = await unlockVault(authDeps, { passphrase });
          const signer = createSigner(nextSession, passphrase);
          authDeps.signerManager.setSigner(signer);
          setSession(nextSession);
          setMode("authenticated");
          setStatus("");
        } catch (error) {
          setStatus(toLocalizedErrorMessage(error, t) || t("auth.unlockTitle"));
        }
      },
      async revealSecret(passphrase: string) {
        try {
          return await exportSecretKey(authDeps, { passphrase });
        } catch (error) {
          if (error instanceof AuthError) {
            throw new Error(toLocalizedErrorMessage(error, t) || t("auth.runtime.unexpectedRevealError"));
          }

          throw new Error(t("auth.runtime.unexpectedRevealError"));
        }
      },
      logout() {
        logoutUseCase(authDeps.vaultRepository);
        authDeps.signerManager.setSigner(null);
        setGeneratedNsec("");
        setPendingGeneratedProfile(null);
        setSession(null);
        setStatus("");
        setMode("welcome");
      },
      async dismissGeneratedSecret() {
        if (!pendingGeneratedProfile) {
          setGeneratedNsec("");
          return;
        }

        setStatus(t("common.app.loadingVault"));

        try {
          await saveGeneratedProfile(authDeps, {
            secretKeyHex: pendingGeneratedProfile.secretKeyHex,
            passphrase: pendingGeneratedProfile.passphrase,
            pubkey: pendingGeneratedProfile.session.pubkey,
            npub: pendingGeneratedProfile.session.npub,
            role: pendingGeneratedProfile.session.role
          });
          const signer = createSigner(
            pendingGeneratedProfile.session,
            pendingGeneratedProfile.passphrase
          );
          authDeps.signerManager.setSigner(signer);
          setSession(pendingGeneratedProfile.session);
          setMode("authenticated");
          setGeneratedNsec("");
          setPendingGeneratedProfile(null);
          setStatus("");
        } catch (error) {
          setStatus(
            toLocalizedErrorMessage(error, t) || t("common.app.loadingVault")
          );
        }
      },
    }),
    [authDeps, createSigner, pendingGeneratedProfile, pendingRolePick, t]
  );

  return {
    mode,
    session,
    role: session?.role ?? null,
    status,
    generatedNsec,
    isAuthenticated,
    actions
  };
}
