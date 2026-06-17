import type { WindowNostr } from "nostr-tools/nip07";
import { AuthSession } from "../../domain/auth";
import { NostrSigner, SignEventDraft, SignedEvent } from "../../ports/nostrSigner";

export function createNip07Signer(session: AuthSession): NostrSigner {
  const nostr = (window as unknown as { nostr?: WindowNostr }).nostr;
  if (!nostr) {
    throw new Error("NIP-07 extension not found");
  }

  return {
    getSession() {
      return session;
    },
    async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
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
      if (!nostr.nip04?.encrypt) {
        throw new Error("NIP-07 nip04 encrypt not available");
      }
      return nostr.nip04.encrypt(recipientPubkey, plaintext);
    },
    async decrypt(senderPubkey: string, ciphertext: string): Promise<string | null> {
      if (!nostr.nip04?.decrypt) {
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
