import { useEffect, useMemo, useRef, useState } from "react";
import { nip19 } from "nostr-tools";
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
import { nostrClient } from "../nostr/client";
import { createNip07Signer } from "../adapters/nostr/nip07Signer";
import type { WindowNostr } from "nostr-tools/nip07";

type AuthMode =
  | "loading"
  | "welcome"
  | "unlock"
  | "role-pick"
  | "nip07-connecting"
  | "authenticated";

type PendingGeneratedProfile = {
  secretKeyHex: string;
  passphrase: string;
  session: AuthSession;
};

type PendingRolePick = {
  passphrase: string;
};

type Nip07Pending = {
  pubkey: string;
  npub: string;
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

const NIP07_ROLE_DISCOVERY_TIMEOUT = 3000;

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
  const [nip07Pending, setNip07Pending] = useState<Nip07Pending | null>(null);
  const nip07SubRef = useRef<(() => void) | null>(null);
  const nip07TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      nip07SubRef.current?.();
      if (nip07TimerRef.current) clearTimeout(nip07TimerRef.current);
    };
  }, []);

  const isAuthenticated = mode === "authenticated" && session !== null;

  const nip07ExtensionAvailable =
    typeof window !== "undefined" &&
    (window as unknown as { nostr?: WindowNostr }).nostr !== undefined;

  function startNip07RoleDiscovery(pubkey: string, npub: string) {
    let resolved = false;

    nip07SubRef.current = nostrClient.subscribe(
      { kinds: [0], authors: [pubkey], limit: 1 },
      (event) => {
        if (resolved) return;
        try {
          const parsed = JSON.parse(event.content) as Record<string, unknown>;
          const role = typeof parsed.role === "string"
            ? (parsed.role as AccountRole)
            : null;
          const tagRole = event.tags.find(
            ([k, v]) => k === "t" && (v === "role:tutor" || v === "role:student")
          );

          if (role === "tutor" || role === "student") {
            resolved = true;
            nip07SubRef.current?.();
            if (nip07TimerRef.current) clearTimeout(nip07TimerRef.current);
            finishNip07Auth(pubkey, npub, role);
          } else if (tagRole) {
            resolved = true;
            nip07SubRef.current?.();
            if (nip07TimerRef.current) clearTimeout(nip07TimerRef.current);
            const extractedRole = tagRole[1].split(":")[1] as AccountRole;
            finishNip07Auth(pubkey, npub, extractedRole);
          }
        } catch {
          // ignore parse errors
        }
      },
    );

    nip07TimerRef.current = setTimeout(() => {
      if (resolved) return;
      nip07SubRef.current?.();
      setNip07Pending({ pubkey, npub });
      setMode("role-pick");
      setStatus("");
    }, NIP07_ROLE_DISCOVERY_TIMEOUT);
  }

  function finishNip07Auth(pubkey: string, npub: string, role: AccountRole) {
    const nextSession: AuthSession = { pubkey, npub, role };
    const signer = createNip07Signer(nextSession);
    authDeps.signerManager.setSigner(signer);
    setSession(nextSession);
    setNip07Pending(null);
    setStatus("");
    setMode("authenticated");
  }

  const actions = useMemo(
    () => ({
      async createProfile(passphrase: string) {
        setStatus("");
        setPendingRolePick({ passphrase });
        setMode("role-pick");
      },
      async chooseRole(role: AccountRole) {
        // NIP-07 role-pick branch
        if (nip07Pending) {
          setStatus(t("auth.connecting"));
          finishNip07Auth(nip07Pending.pubkey, nip07Pending.npub, role);
          return;
        }

        // Vault create branch
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
        // NIP-07 cancel
        if (nip07Pending) {
          setNip07Pending(null);
          setStatus("");
          setMode("welcome");
          return;
        }

        // Vault create cancel
        setPendingRolePick(null);
        setStatus("");
        setMode("welcome");
      },
      async connectNip07() {
        const nostr = (window as unknown as { nostr?: WindowNostr }).nostr;
        if (!nostr) {
          setStatus(t("auth.extensionNotFound") || "NIP-07 extension not found");
          return;
        }

        setStatus(t("auth.connecting"));
        setMode("nip07-connecting");

        try {
          const pubkey = await nostr.getPublicKey();
          const npub = nip19.npubEncode(pubkey);
          setStatus(t("auth.checkingProfile"));
          startNip07RoleDiscovery(pubkey, npub);
        } catch (error) {
          setStatus(toLocalizedErrorMessage(error, t) || t("auth.connectionFailed"));
          setMode("welcome");
        }
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
        nip07SubRef.current?.();
        if (nip07TimerRef.current) clearTimeout(nip07TimerRef.current);
        logoutUseCase(authDeps.vaultRepository);
        authDeps.signerManager.setSigner(null);
        setGeneratedNsec("");
        setPendingGeneratedProfile(null);
        setPendingRolePick(null);
        setNip07Pending(null);
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
    [authDeps, createSigner, pendingGeneratedProfile, pendingRolePick, nip07Pending, t]
  );

  return {
    mode,
    session,
    role: session?.role ?? null,
    status,
    generatedNsec,
    isAuthenticated,
    nip07ExtensionAvailable,
    actions
  };
}
