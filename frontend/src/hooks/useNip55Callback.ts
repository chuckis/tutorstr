import { useEffect } from "react";

/**
 * Checks the current URL for NIP-55 callback parameters.
 * When an external signer app (Amber/Nowser) returns control to the PWA,
 * it appends parameters to the callback URL.
 *
 * Returns the parsed result or null if no callback is detected.
 */
export type Nip55CallbackData =
  | { type: "pubkey"; pubkey: string }
  | { type: "error"; error: string };

export function parseNip55Callback(): Nip55CallbackData | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  // NIP-55 returns pubkey as a query param
  const pubkey = params.get("pubkey");
  if (pubkey && /^[0-9a-f]{64}$/i.test(pubkey)) {
    return { type: "pubkey", pubkey };
  }

  const error = params.get("error");
  if (error) {
    return { type: "error", error };
  }

  // Some signers return the result in the hash fragment
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, "?"),
  );
  const hashPubkey = hashParams.get("pubkey");
  if (hashPubkey && /^[0-9a-f]{64}$/i.test(hashPubkey)) {
    return { type: "pubkey", pubkey: hashPubkey };
  }

  return null;
}

/**
 * Cleans NIP-55 callback params from the URL to prevent reprocessing.
 */
export function cleanNip55CallbackUrl(): void {
  if (typeof window === "undefined") return;

  const clean = window.location.pathname + window.location.hash.replace(/[?#].*/, "");
  window.history.replaceState({}, document.title, clean);
}

/**
 * Hook that detects NIP-55 callbacks and invokes the appropriate handler.
 */
export function useNip55Callback(
  onPubkey: (pubkey: string) => void,
  onError: (error: string) => void,
): void {
  useEffect(() => {
    const data = parseNip55Callback();
    if (!data) return;

    cleanNip55CallbackUrl();

    if (data.type === "pubkey") {
      onPubkey(data.pubkey);
    } else {
      onError(data.error);
    }
  }, [onPubkey, onError]);
}
