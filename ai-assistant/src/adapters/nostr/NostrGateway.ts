import { SimplePool, finalizeEvent, getPublicKey, nip19 } from "nostr-tools";
import type { Event, Filter } from "nostr-tools";
import { decryptNip44, encryptNip44 } from "./Crypto.js";
import type { INostrGateway, DecryptedEvent, HomeworkHandler } from "../../domain/ports/INostrGateway.js";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export class NostrGateway implements INostrGateway {
  private pool: SimplePool;
  private relays: string[] = [];
  private botPrivkeyBytes: Uint8Array = new Uint8Array();
  private botPrivkeyHex: string = "";
  private botPubkey: string = "";

  constructor() {
    this.pool = new SimplePool();
  }

  async connect(): Promise<void> {
    this.relays = process.env.NOSTR_RELAYS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const rawKey = process.env.BOT_PRIVATE_KEY ?? "";

    if (this.relays.length === 0) throw new Error("NOSTR_RELAYS is empty");
    if (!rawKey) throw new Error("BOT_PRIVATE_KEY is not set");

    if (rawKey.startsWith("nsec1")) {
      const decoded = nip19.decode(rawKey);
      this.botPrivkeyBytes = decoded.data as Uint8Array;
      this.botPrivkeyHex = Array.from(this.botPrivkeyBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      this.botPrivkeyBytes = hexToBytes(rawKey);
      this.botPrivkeyHex = rawKey;
    }

    this.botPubkey = getPublicKey(this.botPrivkeyBytes);

    console.log(`[NostrGateway] Connecting to ${this.relays.length} relays`);
    console.log(`[NostrGateway] Bot pubkey: ${this.botPubkey}`);

    await this.publishProfile();
  }

  private async publishProfile(): Promise<void> {
    const eventTemplate = {
      kind: 0,
      content: JSON.stringify({ name: "TutorHub AI Assistant", about: "Homework review bot" }),
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
    };
    const signedEvent = finalizeEvent(eventTemplate, this.botPrivkeyBytes);
    const promises = this.pool.publish(this.relays, signedEvent as never);
    promises.forEach((p) => p.catch(() => {}));
    await Promise.any(promises);
    console.log(`[NostrGateway] Published profile (kind:0) — ${signedEvent.id.slice(0, 8)}`);
  }

  async disconnect(): Promise<void> {
    this.pool.close(this.relays);
  }

  async subscribeHomeworkSubmissions(handler: HomeworkHandler): Promise<() => void> {
    const filter: Filter = {
      kinds: [4],
      "#p": [this.botPubkey],
    };

    console.log(`[NostrGateway] Subscribing to kind:4 with #p:${this.botPubkey}`);

    const sub = this.pool.subscribeMany(
      this.relays,
      filter,
      {
        onevent: async (event: Event) => {
          try {
            const decrypted = await this.processIncoming(event);
            if (decrypted) console.log("[NostrGateway] Received", decrypted.isHomework ? "homework" : "DM", "from", decrypted.studentPubkey.slice(0, 8) + "..");
            if (!decrypted) return;

            await handler(decrypted);
          } catch (err) {
            console.error("[NostrGateway] Error processing event:", err);
          }
        },
        oneose: () => {
          console.log("[NostrGateway] EOSE received");
        },
      },
    );

    return () => { (sub as { close: () => void }).close(); };
  }

  async sendEncrypted(params: {
    recipientPubkey: string;
    plaintext: string;
    tags: string[][];
  }): Promise<string> {
    const ciphertext = encryptNip44(this.botPrivkeyHex, params.recipientPubkey, params.plaintext);

    const eventTemplate = {
      kind: 4,
      content: ciphertext,
      created_at: Math.floor(Date.now() / 1000),
      tags: params.tags,
    };

    const signedEvent = finalizeEvent(eventTemplate, this.botPrivkeyBytes);

    const promises = this.pool.publish(this.relays, signedEvent as never);
    promises.forEach((p) => p.catch(() => {}));
    await Promise.any(promises);

    console.log(`[NostrGateway] Published event ${signedEvent.id} to ${params.recipientPubkey.slice(0, 8)}...`);
    return signedEvent.id;
  }

  private async processIncoming(event: Event): Promise<DecryptedEvent | null> {
    const pTags = event.tags.filter((t) => t[0] === "p");
    const tTags = event.tags.filter((t) => t[0] === "t");
    const eTags = event.tags.filter((t) => t[0] === "e");

    const isHomework = tTags.some((t) => t[1] === "homework-submission");
    if (!isHomework) return null;

    const tutorTag = pTags.find((t) => t[1] !== this.botPubkey);
    if (!tutorTag?.[1]) return null;

    let plaintext: string;
    try {
      plaintext = decryptNip44(this.botPrivkeyHex, event.pubkey, event.content);
    } catch {
      console.warn(`[NostrGateway] Failed to decrypt event ${event.id}`);
      return null;
    }

    const rootTag = eTags.find((t) => t[3] === "root");
    const replyTag = eTags.find((t) => t[3] === "reply");

    return {
      event,
      plaintext,
      studentPubkey: event.pubkey,
      tutorPubkey: tutorTag[1],
      isHomework: true,
      rootEventId: rootTag?.[1] ?? (eTags.length === 0 ? undefined : event.id),
      isReply: !!replyTag,
      parentEventId: replyTag?.[1],
    };
  }
}
