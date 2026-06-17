import { useEffect, useMemo, useRef, useState } from "react";
import { nip19 } from "nostr-tools";
import { createNewProfile } from "../application/auth/createNewProfile";
import { exportSecretKey } from "../application/auth/exportSecretKey";
import { importExistingKey } from "../application/auth/importExistingKey";
import { logout as logoutUseCase } from "../application/auth/logout";
import { restoreStoredSession, restoreNip46Signer } from "../application/auth/restoreStoredSession";
import { saveGeneratedProfile } from "../application/auth/saveGeneratedProfile";
import { unlockVault } from "../application/auth/unlockVault";
import { saveNip07Session } from "../application/auth/saveNip07Session";
import { parseBunkerInput } from "../application/auth/parseBunkerInput";
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
import { Nip55Signer } from "../adapters/nostr/nip55Signer";
import { Nip46Signer } from "../adapters/nostr/nip46Signer";
import type { WindowNostr } from "nostr-tools/nip07";

const NIP55_CALLBACK_URL = typeof window !== "undefined"
  ? `${window.location.origin}${window.location.pathname}`
  : "";

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

type Nip55Pending = {
  pubkey: string;
  npub: string;
};

type Nip46Pending = {
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
  const [nip55Pending, setNip55Pending] = useState<Nip55Pending | null>(null);
  const [nip46Pending, setNip46Pending] = useState<Nip46Pending | null>(null);
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

    if (restored.method === "nip07") {
      const signer = createNip07Signer(restored);
      authDeps.signerManager.setSigner(signer);
      setMode("authenticated");
      return;
    }

    if (restored.method === "nip46") {
      const signer = restoreNip46Signer();
      if (signer && signer.isConnected()) {
        authDeps.signerManager.setSigner(signer);
        setMode("authenticated");
        return;
      }
      // Session expired — clear and go to welcome
      Nip46Signer.clearPersistedSession();
      authDeps.signerManager.setSigner(null);
      setSession(null);
      setMode("welcome");
      return;
    }

    // Vault-based session requires unlock
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
    const nextSession: AuthSession = { pubkey, npub, role, method: "nip07" };
    const signer = createNip07Signer(nextSession);
    authDeps.signerManager.setSigner(signer);
    saveNip07Session(pubkey, npub, role);
    setSession(nextSession);
    setNip07Pending(null);
    setStatus("");
    setMode("authenticated");
  }

  function finishNip55Auth(pubkey: string, npub: string, role: AccountRole) {
    const nextSession: AuthSession = { pubkey, npub, role, method: "nip55" };
    const signer = new Nip55Signer(NIP55_CALLBACK_URL);
    signer.setSession(pubkey);
    authDeps.signerManager.setSigner(signer);
    setSession(nextSession);
    setNip55Pending(null);
    setStatus("");
    setMode("authenticated");
  }

  function finishNip46Auth(pubkey: string, npub: string, role: AccountRole) {
    const nextSession: AuthSession = { pubkey, npub, role, method: "nip46" };
    // Signer is already set via connectBunker, just update session
    setSession(nextSession);
    setNip46Pending(null);
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
        // NIP-46 role-pick branch
        if (nip46Pending) {
          finishNip46Auth(nip46Pending.pubkey, nip46Pending.npub, role);
          return;
        }

        // NIP-55 role-pick branch
        if (nip55Pending) {
          setStatus(t("auth.connecting"));
          finishNip55Auth(nip55Pending.pubkey, nip55Pending.npub, role);
          return;
        }

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
        if (nip46Pending) {
          setNip46Pending(null);
          Nip46Signer.clearPersistedSession();
          authDeps.signerManager.setSigner(null);
          setStatus("");
          setMode("welcome");
          return;
        }

        if (nip55Pending) {
          setNip55Pending(null);
          setStatus("");
          setMode("welcome");
          return;
        }

        if (nip07Pending) {
          setNip07Pending(null);
          setStatus("");
          setMode("welcome");
          return;
        }

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
      async connectNip55() {
        setStatus(t("auth.connecting"));
        setMode("nip07-connecting");

        try {
          const signer = new Nip55Signer(NIP55_CALLBACK_URL);
          await signer.requestPublicKey();
        } catch (error) {
          setStatus(toLocalizedErrorMessage(error, t) || t("auth.connectionFailed"));
          setMode("welcome");
        }
      },
      completeNip55Auth(pubkey: string) {
        const npub = nip19.npubEncode(pubkey);
        const signer = new Nip55Signer(NIP55_CALLBACK_URL);
        signer.setSession(pubkey);
        authDeps.signerManager.setSigner(signer);
        setNip55Pending({ pubkey, npub });
        setMode("role-pick");
        setStatus("");
      },
      async connectBunker(bunkerUri: string) {
        const parsed = parseBunkerInput(bunkerUri);
        if (!parsed) {
          setStatus("Invalid bunker URI or Nostr address");
          return;
        }

        if (parsed.type === "nip05") {
          // NIP-05 resolution not yet implemented — require direct bunker URI
          setStatus("Direct bunker:// URI required. NIP-05 resolution coming soon.");
          setMode("welcome");
          return;
        }

        const relayUrl = parsed.relayUrls[0];
        if (!relayUrl) {
          setStatus("Bunker URI must include a relay parameter (?relay=wss://...)");
          setMode("welcome");
          return;
        }

        setStatus(t("auth.bunkerConnecting"));
        setMode("nip07-connecting");

        try {
          const signer = new Nip46Signer(parsed.bunkerPubkey, relayUrl);
          const userPubkey = await signer.connect();
          const npub = nip19.npubEncode(userPubkey);

          authDeps.signerManager.setSigner(signer);

          setNip46Pending({ pubkey: userPubkey, npub });
          setMode("role-pick");
          setStatus("");
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Bunker connection failed"
          );
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
        Nip46Signer.clearPersistedSession();
        authDeps.signerManager.setSigner(null);
        setGeneratedNsec("");
        setPendingGeneratedProfile(null);
        setPendingRolePick(null);
        setNip07Pending(null);
        setNip55Pending(null);
        setNip46Pending(null);
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
    [authDeps, createSigner, pendingGeneratedProfile, pendingRolePick, nip07Pending, nip55Pending, nip46Pending, t]
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
