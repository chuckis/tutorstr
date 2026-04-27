import { useEffect, useMemo, useState } from "react";
import { createNewProfile } from "../application/auth/createNewProfile";
import { exportSecretKey } from "../application/auth/exportSecretKey";
import { importExistingKey } from "../application/auth/importExistingKey";
import { logout as logoutUseCase } from "../application/auth/logout";
import { restoreStoredSession } from "../application/auth/restoreStoredSession";
import { saveGeneratedProfile } from "../application/auth/saveGeneratedProfile";
import { unlockVault } from "../application/auth/unlockVault";
import { authVaultRepository } from "../adapters/auth/localStorageVaultRepository";
import { nostrKeyMaterial } from "../adapters/auth/nostrKeyMaterial";
import { webCryptoVaultCipher } from "../adapters/auth/webCryptoVaultCipher";
import { createVaultNostrSigner } from "../adapters/nostr/vaultNostrSigner";
import { AuthError, AuthSession } from "../domain/auth";
import { nostrClient } from "../nostr/client";

type AuthMode = "loading" | "welcome" | "unlock" | "authenticated";

type PendingGeneratedProfile = {
  secretKeyHex: string;
  passphrase: string;
  session: AuthSession;
};

const authDependencies = {
  vaultRepository: authVaultRepository,
  vaultCipher: webCryptoVaultCipher,
  keyMaterial: nostrKeyMaterial
};

export function useAuthController() {
  const [mode, setMode] = useState<AuthMode>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState("");
  const [generatedNsec, setGeneratedNsec] = useState("");
  const [pendingGeneratedProfile, setPendingGeneratedProfile] =
    useState<PendingGeneratedProfile | null>(null);

  useEffect(() => {
    const restored = restoreStoredSession(authVaultRepository);
    if (!restored) {
      nostrClient.setSigner(null);
      setSession(null);
      setMode("welcome");
      return;
    }

    setSession(restored);
    setMode("unlock");
  }, []);

  const isAuthenticated = mode === "authenticated" && session !== null;

  const actions = useMemo(
    () => ({
      async createProfile(passphrase: string) {
        setStatus("Generating your Nostr key...");

        try {
          const result = await createNewProfile(authDependencies, { passphrase });
          setGeneratedNsec(result.nsec);
          setPendingGeneratedProfile({
            secretKeyHex: result.secretKeyHex,
            passphrase,
            session: result.session
          });
          setStatus("");
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Failed to create profile."
          );
        }
      },
      async importProfile(secret: string, passphrase: string) {
        setStatus("Importing your key...");

        try {
          const nextSession = await importExistingKey(authDependencies, {
            secret,
            passphrase
          });
          const signer = createVaultNostrSigner(nextSession, passphrase);
          nostrClient.setSigner(signer);
          setGeneratedNsec("");
          setSession(nextSession);
          setMode("authenticated");
          setStatus("");
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Failed to import key."
          );
        }
      },
      async unlock(passphrase: string) {
        setStatus("Unlocking your vault...");

        try {
          const nextSession = await unlockVault(authDependencies, { passphrase });
          const signer = createVaultNostrSigner(nextSession, passphrase);
          nostrClient.setSigner(signer);
          setSession(nextSession);
          setMode("authenticated");
          setStatus("");
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Failed to unlock vault."
          );
        }
      },
      async revealSecret(passphrase: string) {
        try {
          return await exportSecretKey(authDependencies, { passphrase });
        } catch (error) {
          if (error instanceof AuthError) {
            throw error;
          }

          throw new Error("Failed to reveal secret key.");
        }
      },
      logout() {
        logoutUseCase(authVaultRepository);
        nostrClient.setSigner(null);
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

        setStatus("Encrypting your vault...");

        try {
          await saveGeneratedProfile(authDependencies, {
            secretKeyHex: pendingGeneratedProfile.secretKeyHex,
            passphrase: pendingGeneratedProfile.passphrase,
            pubkey: pendingGeneratedProfile.session.pubkey,
            npub: pendingGeneratedProfile.session.npub
          });
          const signer = createVaultNostrSigner(
            pendingGeneratedProfile.session,
            pendingGeneratedProfile.passphrase
          );
          nostrClient.setSigner(signer);
          setSession(pendingGeneratedProfile.session);
          setMode("authenticated");
          setGeneratedNsec("");
          setPendingGeneratedProfile(null);
          setStatus("");
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Failed to secure profile."
          );
        }
      },
    }),
    [pendingGeneratedProfile]
  );

  return {
    mode,
    session,
    status,
    generatedNsec,
    isAuthenticated,
    actions
  };
}
