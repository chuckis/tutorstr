import type { WindowNostr } from "nostr-tools/nip07";
import { AuthSession } from "../../domain/auth";
import { NostrSigner, SignEventDraft, SignedEvent } from "../../ports/nostrSigner";

function getNostr(): WindowNostr | null {
  return (window as unknown as { nostr?: WindowNostr }).nostr ?? null;
}

export function isNip07Available(): boolean {
  return getNostr() !== null;
}

export function createNip07Signer(session: AuthSession): NostrSigner {
  return {
    getSession() {
      return session;
    },
    async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
      const nostr = getNostr();
      if (!nostr) {
        throw new Error("NIP-07 extension not found");
      }
      const event = await nostr.signEvent(draft);
      return {
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
        sig: event.sig,
      };
    },
    async encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
      const nostr = getNostr();
      if (!nostr?.nip04?.encrypt) {
        throw new Error("NIP-07 nip04 encrypt not available");
      }
      return nostr.nip04.encrypt(recipientPubkey, plaintext);
    },
    async decrypt(senderPubkey: string, ciphertext: string): Promise<string | null> {
      const nostr = getNostr();
      if (!nostr?.nip04?.decrypt) {
        return null;
      }
      try {
        return await nostr.nip04.decrypt(senderPubkey, ciphertext);
      } catch {
        return null;
      }
    },
  };
}
