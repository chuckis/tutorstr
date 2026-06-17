import { nip19 } from "nostr-tools";
import type { NostrSigner, SignEventDraft, SignedEvent } from "../../ports/nostrSigner";
import type { AuthSession } from "../../domain/auth";

const PENDING_KEY = "tutorhub:nip55-pending";
const RESULT_KEY = "tutorhub:nip55-result";
const SESSION_KEY = "tutorhub:nip55-session";

export type Nip55PendingRequest = {
  type: "get_public_key" | "sign_event";
};

export type Nip55CallbackResult =
  | { type: "pubkey"; pubkey: string }
  | { type: "error"; message: string };

export function savePendingRequest(req: Nip55PendingRequest): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(req));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function consumePendingRequest(): Nip55PendingRequest | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as Nip55PendingRequest;
  } catch {
    return null;
  }
}

export function saveCallbackResult(result: Nip55CallbackResult): void {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
}

export function consumeCallbackResult(): Nip55CallbackResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESULT_KEY);
    return JSON.parse(raw) as Nip55CallbackResult;
  } catch {
    return null;
  }
}

function saveSession(pubkey: string): void {
  try {
    const npub = nip19.npubEncode(pubkey);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ pubkey, npub }));
  } catch {
    // ignore
  }
}

export function consumeSession(): { pubkey: string; npub: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SESSION_KEY);
    return JSON.parse(raw) as { pubkey: string; npub: string };
  } catch {
    return null;
  }
}

export function buildNip55Url(
  type: "get_public_key" | "sign_event",
  callbackUrl: string,
  eventJson?: string,
): string {
  const params = new URLSearchParams({
    type,
    callbackUrl,
    compression: "none",
  });
  // For sign_event, the payload is the event JSON
  if (type === "sign_event" && eventJson) {
    return `nostrsigner:${encodeURIComponent(eventJson)}?${params}`;
  }
  return `nostrsigner:?${params}`;
}

function npubFromPubkey(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

export class Nip55Signer implements NostrSigner {
  private session: { pubkey: string; npub: string } | null = null;

  constructor(private readonly callbackUrl: string) {
    const saved = consumeSession();
    if (saved) {
      this.session = saved;
    }
  }

  setSession(pubkey: string): void {
    this.session = { pubkey, npub: npubFromPubkey(pubkey) };
  }

  getSession(): AuthSession {
    if (!this.session) throw new Error("NIP-55 signer not initialized");
    // Return partial session — role must be set separately
    return { pubkey: this.session.pubkey, npub: this.session.npub, role: "tutor", method: "nip55" };
  }

  async requestPublicKey(): Promise<string> {
    savePendingRequest({ type: "get_public_key" });
    const url = buildNip55Url("get_public_key", this.callbackUrl);
    window.location.href = url;
    // The page will navigate away. On return, the callback handler
    // stores the result in sessionStorage and the app re-initializes.
    return new Promise(() => { /* never settles directly */ });
  }

  async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
    savePendingRequest({ type: "sign_event" });
    const url = buildNip55Url("sign_event", this.callbackUrl, JSON.stringify(draft));
    window.location.href = url;
    return new Promise(() => { /* never settles directly */ });
  }

  async encrypt(_recipientPubkey: string, _plaintext: string): Promise<string> {
    throw new Error("NIP-55 signer does not support encryption. Use NIP-46 or vault signer.");
  }

  async decrypt(_senderPubkey: string, _ciphertext: string): Promise<string | null> {
    throw new Error("NIP-55 signer does not support decryption. Use NIP-46 or vault signer.");
  }
}
