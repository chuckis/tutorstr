import { SimplePool } from "nostr-tools/pool";
import { DEFAULT_RELAYS } from "./config";
import { NostrSigner } from "../adapters/nostr/vaultNostrSigner";

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
  private signer: NostrSigner | null = null;

  private static readonly RELAY_STORAGE = "tutorhub:relays";

  constructor(relays: string[] = DEFAULT_RELAYS) {
    const storedRelays = localStorage.getItem(NostrClient.RELAY_STORAGE);
    if (storedRelays) {
      try {
        const parsed = JSON.parse(storedRelays) as string[];
        this.relays = parsed.filter(Boolean);
      } catch {
        this.relays = [...relays];
      }
    } else {
      this.relays = [...relays];
    }
    this.pool = new SimplePool();
  }

  getRelays() {
    return [...this.relays];
  }

  setRelays(relays: string[]) {
    this.relays = [...relays];
    localStorage.setItem(NostrClient.RELAY_STORAGE, JSON.stringify(this.relays));
  }

  async publish(event: NostrEvent) {
    if (this.relays.length === 0) {
      throw new Error("No relays configured");
    }

    await Promise.any(this.pool.publish(this.relays, event));
  }

  setSigner(signer: NostrSigner | null) {
    this.signer = signer;
  }

  getSignerSession() {
    return this.signer?.getSession() ?? null;
  }

  private requireSigner() {
    if (!this.signer) {
      throw new Error("Authentication required.");
    }

    return this.signer;
  }

  async publishEvent(kind: number, content: string, tags: string[][] = []) {
    const signer = this.requireSigner();
    const event = await signer.signEvent({
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content
    });

    await this.publish(event);
    return event;
  }

  async encryptContent(recipientPubkey: string, plaintext: string) {
    return this.requireSigner().encrypt(recipientPubkey, plaintext);
  }

  async decryptContent(senderPubkey: string, ciphertext: string) {
    return this.requireSigner().decrypt(senderPubkey, ciphertext);
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

  async publishReplaceableEvent(
    kind: number,
    content: string,
    tags: string[][] = []
  ) {
    return this.publishEvent(kind, content, tags);
  }

  async publishTestEvent() {
    const session = this.getSignerSession();
    if (!session) {
      throw new Error("Authentication required.");
    }

    const event = await this.requireSigner().signEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["t", "tutorhub:test"]],
      content: `TutorHub test event from ${session.pubkey.slice(0, 8)}`
    });

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
