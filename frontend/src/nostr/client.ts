import { SimplePool } from "nostr-tools/pool";
import { nip04, nip19 } from "nostr-tools";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { DEFAULT_RELAYS } from "./config";

export type NostrFilter = {
  ids?: string[];
  kinds?: number[];
  authors?: string[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: string[] | number[] | number | undefined;
};

export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export type SubscribeOptions = {
  onEose?: () => void;
};

export class NostrClient {
  private pool: SimplePool;
  private relays: string[];

  private static readonly KEY_STORAGE = "tutorhub:nsec";

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.relays = [...relays];
    this.pool = new SimplePool();
  }

  getRelays() {
    return [...this.relays];
  }

  setRelays(relays: string[]) {
    this.relays = [...relays];
  }

  async publish(event: NostrEvent) {
    if (this.relays.length === 0) {
      throw new Error("No relays configured");
    }

    await Promise.any(this.pool.publish(this.relays, event));
  }

  async publishEvent(kind: number, content: string, tags: string[][] = []) {
    const { secretKey } = this.getOrCreateKeypair();
    const event = finalizeEvent(
      {
        kind,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content
      },
      secretKey
    ) as NostrEvent;

    await this.publish(event);
    return event;
  }

  async encryptContent(recipientPubkey: string, plaintext: string) {
    const { secretKey } = this.getOrCreateKeypair();
    return nip04.encrypt(secretKey, recipientPubkey, plaintext);
  }

  async decryptContent(senderPubkey: string, ciphertext: string) {
    const { secretKey } = this.getOrCreateKeypair();
    try {
      return await nip04.decrypt(secretKey, senderPubkey, ciphertext);
    } catch {
      return null;
    }
  }

  async publishEncryptedEvent(
    kind: number,
    recipientPubkey: string,
    plaintext: string,
    tags: string[][] = []
  ) {
    const content = await this.encryptContent(recipientPubkey, plaintext);
    const mergedTags = [["p", recipientPubkey], ...tags];
    return this.publishEvent(kind, content, mergedTags);
  }

  getOrCreateKeypair() {
    const stored = localStorage.getItem(NostrClient.KEY_STORAGE);
    if (stored) {
      try {
        const decoded = nip19.decode(stored);
        if (decoded.type === "nsec") {
          const secretKey = decoded.data as Uint8Array;
          return {
            secretKey,
            pubkey: getPublicKey(secretKey),
            nsec: stored,
            npub: nip19.npubEncode(getPublicKey(secretKey))
          };
        }
      } catch {
        // fall through to regenerate
      }
    }

    const secretKey = generateSecretKey();
    const nsec = nip19.nsecEncode(secretKey);
    localStorage.setItem(NostrClient.KEY_STORAGE, nsec);
    const pubkey = getPublicKey(secretKey);
    return {
      secretKey,
      pubkey,
      nsec,
      npub: nip19.npubEncode(pubkey)
    };
  }

  async publishReplaceableEvent(
    kind: number,
    content: string,
    tags: string[][] = []
  ) {
    return this.publishEvent(kind, content, tags);
  }

  async publishTestEvent() {
    const secretKey = generateSecretKey();
    const pubkey = getPublicKey(secretKey);

    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "tutorhub:test"]],
        content: `TutorHub test event from ${pubkey.slice(0, 8)}`
      },
      secretKey
    ) as NostrEvent;

    await this.publish(event);
    return event;
  }

  subscribe(
    filters: NostrFilter | NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    options: SubscribeOptions = {}
  ) {
    const subscription = this.pool.subscribe(this.relays, filters, {
      onevent: onEvent,
      oneose: options.onEose
    });

    return () => subscription.close();
  }

  subscribeByKind(
    kind: number,
    onEvent: (event: NostrEvent) => void,
    options: SubscribeOptions & { limit?: number } = {}
  ) {
    const filter: NostrFilter = { kinds: [kind] };
    if (options.limit) {
      filter.limit = options.limit;
    }

    return this.subscribe(filter, onEvent, { onEose: options.onEose });
  }

  close() {
    this.pool.close(this.relays);
  }
}

export const nostrClient = new NostrClient();
