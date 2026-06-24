import { useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { generateMnemonicProfile } from "../application/auth/generateMnemonicProfile";
import type { MnemonicProfileResult } from "../application/auth/generateMnemonicProfile";
import { exportSecretKey } from "../application/auth/exportSecretKey";
import type { ExportedSecret } from "../application/auth/exportSecretKey";
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
import { createNip07Signer, isNip07Available } from "../adapters/nostr/nip07Signer";
import type { WindowNostr } from "nostr-tools/nip07";
import { Nip55Signer } from "../adapters/nostr/nip55Signer";
import { Nip46Signer } from "../adapters/nostr/nip46Signer";

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
  mnemonic: string;
};

type PendingRolePick = {
  passphrase: string;
};

type PendingImportProfile = {
  secret: string;
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

const NIP07_ROLE_DISCOVERY_TIMEOUT = 8000;
const ROLE_DISCOVERY_TIMEOUT = 5000;

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}


function parseRoleFromKind0Event(event: { content: string; tags: string[][] }): AccountRole | null {
  try {
    const parsed = JSON.parse(event.content) as Record<string, unknown>;
    const role = parsed.role;
    if (role === "tutor" || role === "student") {
      return role as AccountRole;
    }
  } catch {
    // ignore parse errors
  }

  const tagRole = event.tags.find(
    ([k, v]) => k === "t" && (v === "role:tutor" || v === "role:student")
  );
  if (tagRole) {
    return tagRole[1].split(":")[1] as AccountRole;
  }

  return null;
}

function discoverRoleFromKind0(pubkey: string, timeoutMs: number): Promise<AccountRole | null> {
  return new Promise((resolve) => {
    let resolved = false;

    const unsub = nostrClient.subscribe(
      { kinds: [0], authors: [pubkey], limit: 1 },
      (event) => {
        if (resolved) return;
        const role = parseRoleFromKind0Event(event);
        if (role) {
          resolved = true;
          clearTimeout(timer);
          unsub();
          resolve(role);
        }
      },
    );

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      unsub();
      resolve(null);
    }, timeoutMs);
  });
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
  const [generatedMnemonic, setGeneratedMnemonic] = useState("");
  const [pendingGeneratedProfile, setPendingGeneratedProfile] =
    useState<PendingGeneratedProfile | null>(null);
  const [pendingRolePick, setPendingRolePick] = useState<PendingRolePick | null>(null);
  const [pendingImportProfile, setPendingImportProfile] = useState<PendingImportProfile | null>(null);
  const [nip07Pending, setNip07Pending] = useState<Nip07Pending | null>(null);
  const [nip55Pending, setNip55Pending] = useState<Nip55Pending | null>(null);
  const [nip46Pending, setNip46Pending] = useState<Nip46Pending | null>(null);

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
      Nip46Signer.clearPersistedSession();
      authDeps.signerManager.setSigner(null);
      setSession(null);
      setMode("welcome");
      return;
    }

    setMode("unlock");
  }, [authDeps.signerManager, authDeps.vaultRepository]);

  const isAuthenticated = mode === "authenticated" && session !== null;

  const nip07ExtensionAvailable = isNip07Available();

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
        if (nip46Pending) {
          finishNip46Auth(nip46Pending.pubkey, nip46Pending.npub, role);
          return;
        }

        if (nip55Pending) {
          setStatus(t("auth.connecting"));
          finishNip55Auth(nip55Pending.pubkey, nip55Pending.npub, role);
          return;
        }

        if (nip07Pending) {
          setStatus(t("auth.connecting"));
          finishNip07Auth(nip07Pending.pubkey, nip07Pending.npub, role);
          return;
        }

        if (pendingImportProfile) {
          setStatus(t("auth.importPanelTitle"));
          try {
            const nextSession = await importExistingKey(authDeps, {
              secret: pendingImportProfile.secret,
              passphrase: pendingImportProfile.passphrase,
              role
            });
            const signer = createSigner(nextSession, pendingImportProfile.passphrase);
            authDeps.signerManager.setSigner(signer);
            setSession(nextSession);
            setPendingImportProfile(null);
            setMode("authenticated");
            setStatus("");
          } catch (error) {
            setStatus(toLocalizedErrorMessage(error, t) || t("auth.importTitle"));
          }
          return;
        }

        if (!pendingRolePick) {
          return;
        }

        setStatus(t("auth.createTitle"));

        try {
          const result: MnemonicProfileResult = await generateMnemonicProfile(authDeps, {
            role
          });
          setGeneratedNsec(result.nsec);
          setGeneratedMnemonic(result.mnemonic);
          setPendingGeneratedProfile({
            secretKeyHex: result.secretKeyHex,
            passphrase: pendingRolePick.passphrase,
            session: result.session,
            mnemonic: result.mnemonic
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

        if (pendingImportProfile) {
          setPendingImportProfile(null);
          setStatus("");
          setMode("welcome");
          return;
        }

        setPendingRolePick(null);
        setStatus("");
        setMode("welcome");
      },
      async connectNip07() {
        if (!isNip07Available()) {
          setStatus(t("auth.extensionNotFound") || "NIP-07 extension not found");
          return;
        }

        setStatus(t("auth.connecting"));
        setMode("nip07-connecting");

        try {
          const nostr = (window as unknown as { nostr?: WindowNostr }).nostr!;
          const pubkey = await nostr.getPublicKey();
          const npub = nip19.npubEncode(pubkey);
          setStatus(t("auth.checkingProfile"));

          const role = await discoverRoleFromKind0(pubkey, NIP07_ROLE_DISCOVERY_TIMEOUT);
          if (role) {
            finishNip07Auth(pubkey, npub, role);
          } else {
            setNip07Pending({ pubkey, npub });
            setMode("role-pick");
            setStatus("");
          }
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
        setStatus(t("auth.checkingProfile"));

        discoverRoleFromKind0(pubkey, ROLE_DISCOVERY_TIMEOUT).then((role) => {
          if (role) {
            finishNip55Auth(pubkey, npub, role);
          } else {
            const signer = new Nip55Signer(NIP55_CALLBACK_URL);
            signer.setSession(pubkey);
            authDeps.signerManager.setSigner(signer);
            setNip55Pending({ pubkey, npub });
            setMode("role-pick");
            setStatus("");
          }
        });
      },
      async connectBunker(bunkerUri: string) {
        const parsed = parseBunkerInput(bunkerUri);
        if (!parsed) {
          setStatus("Invalid bunker URI or Nostr address");
          return;
        }

        if (parsed.type === "nip05") {
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

          const role = await discoverRoleFromKind0(userPubkey, ROLE_DISCOVERY_TIMEOUT);
          if (role) {
            finishNip46Auth(userPubkey, npub, role);
          } else {
            setNip46Pending({ pubkey: userPubkey, npub });
            setMode("role-pick");
            setStatus("");
          }
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
          const parsed = await authDeps.keyMaterial.parseSecretInput(secret);
          const pubkey = authDeps.keyMaterial.derivePublicKey(parsed.secretKeyHex);

          const role = await discoverRoleFromKind0(pubkey, ROLE_DISCOVERY_TIMEOUT);
          if (role) {
            try {
              const nextSession = await importExistingKey(authDeps, {
                secret,
                passphrase,
                role
              });
              const signer = createSigner(nextSession, passphrase);
              authDeps.signerManager.setSigner(signer);
              setSession(nextSession);
              setMode("authenticated");
              setStatus("");
            } catch (error) {
              setStatus(toLocalizedErrorMessage(error, t) || t("auth.importTitle"));
            }
          } else {
            setPendingImportProfile({ secret, passphrase });
            setMode("role-pick");
            setStatus("");
          }
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
      async revealSecret(passphrase: string): Promise<ExportedSecret> {
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
        Nip46Signer.clearPersistedSession();
        authDeps.signerManager.setSigner(null);
        setGeneratedNsec("");
        setGeneratedMnemonic("");
        setPendingGeneratedProfile(null);
        setPendingRolePick(null);
        setPendingImportProfile(null);
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
          setGeneratedMnemonic("");
          return;
        }

        setStatus(t("common.app.loadingVault"));

        try {
          await saveGeneratedProfile(authDeps, {
            secretKeyHex: pendingGeneratedProfile.secretKeyHex,
            passphrase: pendingGeneratedProfile.passphrase,
            pubkey: pendingGeneratedProfile.session.pubkey,
            npub: pendingGeneratedProfile.session.npub,
            role: pendingGeneratedProfile.session.role,
            mnemonic: pendingGeneratedProfile.mnemonic
          });
          const signer = createSigner(
            pendingGeneratedProfile.session,
            pendingGeneratedProfile.passphrase
          );
          authDeps.signerManager.setSigner(signer);
          setSession(pendingGeneratedProfile.session);
          setMode("authenticated");
          setGeneratedNsec("");
          setGeneratedMnemonic("");
          setPendingGeneratedProfile(null);
          setStatus("");
        } catch (error) {
          setStatus(
            toLocalizedErrorMessage(error, t) || t("common.app.loadingVault")
          );
        }
      },
    }),
    [authDeps, createSigner, pendingGeneratedProfile, pendingRolePick, pendingImportProfile, nip07Pending, nip55Pending, nip46Pending, t]
  );

  return {
    mode,
    session,
    role: session?.role ?? null,
    status,
    generatedNsec,
    generatedMnemonic,
    isAuthenticated,
    nip07ExtensionAvailable,
    actions
  };
}
