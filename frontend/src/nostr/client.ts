import { SimplePool } from "nostr-tools/pool";
import { DEFAULT_RELAYS } from "./config";
import { NostrSigner } from "../ports/nostrSigner";
import type { Filter } from "nostr-tools";
import type { Event } from "nostr-tools";

export type NostrFilter = Filter;

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

const DEBUG_NOSTR =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_NOSTR === "true";

function logIncomingEvent(event: NostrEvent) {
  if (!DEBUG_NOSTR) {
    return;
  }

  console.groupCollapsed(`[NOSTR EVENT kind=${event.kind}]`);
  console.log("[NOSTR EVENT]", event);
  console.log("[EVENT META]", {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    created_at: event.created_at
  });
  console.groupEnd();
}

// nostr-tools querySync / subscribeMany accept Filter (single object), not Filter[].
// Passing an array makes the Pool wrap it in an outer array, producing an invalid
// REQ message: ["REQ","id",[filter1,filter2]] instead of ["REQ","id",filter1,filter2].
// This function is only used by query methods where a single filter is sufficient.
function filtersToSingleFilter(filters: NostrFilter | NostrFilter[]): NostrFilter {
  return Array.isArray(filters) ? filters[0] : filters;
}

export class NostrClient {
  private pool: SimplePool;
  private relays: string[];
  private signer: NostrSigner | null = null;

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.relays = [...relays];
    this.pool = new SimplePool({ enableReconnect: true });
  }

  getRelays() {
    return [...this.relays];
  }

  setRelays(relays: string[]) {
    this.relays = [...relays];
    localStorage.setItem("tutorhub:relays", JSON.stringify(this.relays));
  }

  async publish(event: NostrEvent) {
    if (this.relays.length === 0) {
      throw new Error("common.runtime.noRelaysConfigured");
    }

    // pool.publish returns one Promise per relay.
    // Promise.any resolves when the first relay confirms the write.
    // Other relays are silently caught — writing to at least one relay is enough.
    const results = this.pool.publish(this.relays, event as unknown as Event);
    results.forEach(p => p.catch(() => {}));
    await Promise.any(results);
  }

  setSigner(signer: NostrSigner | null) {
    this.signer = signer;
  }

  getSignerSession() {
    return this.signer?.getSession() ?? null;
  }

  getSigner(): NostrSigner | null {
    return this.signer;
  }

  private requireSigner() {
    if (!this.signer) {
      throw new Error("common.runtime.authenticationRequired");
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
      throw new Error("common.runtime.authenticationRequired");
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

  // Long-lived subscription on the main pool (enableReconnect: true).
  //
  // We don't use pool.subscribeMany(filters) because its signature is
  // subscribeMany(relays: string[], filter: Filter, ...) — a SINGLE Filter
  // object, not Filter[]. Passing an array makes the Pool wrap it again,
  // sending an invalid REQ: ["REQ","id",[filter1,filter2]] instead of the
  // correct ["REQ","id",filter1,filter2].
  //
  // Instead we build an array of { url, filter } records, one per (relay ×
  // filter). Pool.subscribeMap groups them by URL and passes the relay
  // a correct Filter[] per the Nostr protocol.
  subscribe(
    filters: NostrFilter | NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    options: SubscribeOptions = {}
  ) {
    const filterList = Array.isArray(filters) ? filters : [filters];

    // Each filter becomes a separate entry for subscribeMap.
    // With 3 relays × 12 filters this yields 36 entries;
    // subscribeMap groups them into 3 groups (one per URL) with 12 filters each.
    const requests = this.relays.flatMap(url =>
        filterList.map(filter => ({ url, filter }))
    );

    const subscription = this.pool.subscribeMap(
        requests as unknown as Parameters<SimplePool['subscribeMap']>[0],
        {
            onevent: (event) => {
                onEvent(event as unknown as NostrEvent);
            },
            oneose: options.onEose
        }
    );

    return () => subscription.close();
  }

  // Convenience wrapper: subscribe to a single kind.
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

  // One-shot query: returns an array of events, closes the subscription.
  // Uses filtersToSingleFilter — only the first filter is honoured.
  async query(filters: NostrFilter | NostrFilter[]): Promise<NostrEvent[]> {
    const filter = filtersToSingleFilter(filters);
    const events = await this.pool.querySync(this.relays, filter as unknown as Parameters<SimplePool['querySync']>[1]);
    return events as unknown as NostrEvent[];
  }

  // Subscription to a specific set of relays with its own pool.
  // Unlike subscribe(), doesn't use the shared pool (which may be busy with
  // a long-lived global subscription). Each such subscription lives in its
  // own pool that is closed on unsubscription.
  // Used by addPerUserSubscription() for per-user event subscriptions
  // (to avoid bloating the global REQ).
  subscribeToRelays(
    relays: string[],
    filter: NostrFilter,
    onEvent: (event: NostrEvent) => void,
    onEose?: () => void,
  ): () => void {
    const pool = new SimplePool({ enableReconnect: false });
    const sub = pool.subscribeMany(relays, filter as unknown as Parameters<SimplePool['subscribeMany']>[1], {
      onevent: (event) => {
        onEvent(event as unknown as NostrEvent);
      },
      oneose: onEose,
    });
    return () => {
      sub.close();
      pool.close(relays);
    };
  }

  // One-shot query to specific relays, its own pool.
  // Analogous to query(), but with relay selection.
  // filtersToSingleFilter — only the first filter is used.
  async queryRelays(
    relays: string[],
    filters: NostrFilter | NostrFilter[],
  ): Promise<NostrEvent[]> {
    const pool = new SimplePool({ enableReconnect: false });
    const filter = filtersToSingleFilter(filters);
    try {
      const events = await pool.querySync(relays, filter as unknown as Parameters<SimplePool['querySync']>[1]);
      return events as unknown as NostrEvent[];
    } finally {
      pool.close(relays);
    }
  }

  close() {
    this.pool.close(this.relays);
  }
}


export const nostrClient = new NostrClient();
