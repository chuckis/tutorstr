import { nip04, nip19 } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools/pure";
import type { AuthSession } from "../../domain/auth";
import type { NostrSigner, SignEventDraft, SignedEvent } from "../../ports/nostrSigner";
import type { Filter } from "nostr-tools";

const BUNKER_KIND = 24133;
const CONNECT_TIMEOUT = 30_000;
const SIGN_TIMEOUT = 30_000;
const CRYPTO_TIMEOUT = 15_000;

const SESSION_KEY = "tutorhub:nip46-session";

type Nip46PersistedSession = {
  clientSecretHex: string;
  clientPubkey: string;
  bunkerPubkey: string;
  relayUrl: string;
  userPubkey: string;
};

type JsonRpcResponse = {
  id: string;
  result?: unknown;
  error?: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encrypts a JSON-RPC command for the bunker using NIP-04.
 */
async function encryptRpc(
  clientSecretHex: string,
  bunkerPubkey: string,
  method: string,
  params: unknown[],
): Promise<string> {
  const secretKey = hexToBytes(clientSecretHex);
  const request = { id: generateId(), method, params };
  return nip04.encrypt(secretKey, bunkerPubkey, JSON.stringify(request));
}

/**
 * Decrypts a JSON-RPC response from the bunker.
 */
async function decryptRpc(
  clientSecretHex: string,
  senderPubkey: string,
  ciphertext: string,
): Promise<JsonRpcResponse | null> {
  try {
    const secretKey = hexToBytes(clientSecretHex);
    const plain = await nip04.decrypt(secretKey, senderPubkey, ciphertext);
    if (!plain) return null;
    return JSON.parse(plain) as JsonRpcResponse;
  } catch {
    return null;
  }
}

export class Nip46Signer implements NostrSigner {
  private pool: SimplePool;
  private session: { pubkey: string; npub: string } | null = null;
  private clientSecretHex: string;
  private clientPubkey: string;
  private bunkerPubkey: string;
  private relayUrl: string;
  private userPubkey: string | null = null;

  constructor(bunkerPubkey: string, relayUrl: string, clientSecretHex?: string) {
    if (clientSecretHex) {
      this.clientSecretHex = clientSecretHex;
    } else {
      const secretKey = generateSecretKey();
      this.clientSecretHex = bytesToHex(secretKey);
    }
    this.clientPubkey = getPublicKey(hexToBytes(this.clientSecretHex));
    this.bunkerPubkey = bunkerPubkey;
    this.relayUrl = relayUrl;
    this.pool = new SimplePool({ enableReconnect: false });
  }

  getSession(): AuthSession {
    if (!this.session) {
      throw new Error("NIP-46 signer not connected");
    }
    return { pubkey: this.session.pubkey, npub: this.session.npub, role: "tutor", method: "nip46" };
  }

  getClientPubkey(): string {
    return this.clientPubkey;
  }

  getBunkerPubkey(): string {
    return this.bunkerPubkey;
  }

  getRelayUrl(): string {
    return this.relayUrl;
  }

  isConnected(): boolean {
    return this.userPubkey !== null;
  }

  /**
   * Connects to the bunker by sending a "connect" request.
   * Returns the user's public key.
   */
  async connect(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const subFilter: Filter = {
        kinds: [BUNKER_KIND],
        authors: [this.bunkerPubkey],
        limit: 10,
      };

      const sub = this.pool.subscribeMany(
        [this.relayUrl],
        subFilter,
        {
          onevent: async (event) => {
            const response = await decryptRpc(
              this.clientSecretHex,
              this.bunkerPubkey,
              event.content,
            );
            if (!response) return;

            if (response.error) {
              sub.close();
              reject(new Error(response.error));
              return;
            }

            if (typeof response.result === "string" || (response.result && typeof response.result === "object")) {
              let userPubkey: string | null = null;

              if (typeof response.result === "string") {
                userPubkey = response.result;
              } else if (response.result && typeof response.result === "object") {
                userPubkey = (response.result as Record<string, unknown>).pubkey as string ?? null;
              }

              if (userPubkey && /^[0-9a-f]{64}$/i.test(userPubkey)) {
                sub.close();
                this.userPubkey = userPubkey;
                const npub = nip19.npubEncode(userPubkey);
                this.session = { pubkey: userPubkey, npub };
                this.persistSession();
                resolve(userPubkey);
              }
            }
          },
        },
      );

      // Send connect request
      this.encryptAndSend("connect", []).catch((err) => {
        sub.close();
        reject(err);
      });

      // Timeout
      setTimeout(() => {
        sub.close();
        reject(new Error("Bunker connection timed out"));
      }, CONNECT_TIMEOUT);
    });
  }

  /**
   * Signs an event by sending a "sign_event" RPC to the bunker.
   */
  async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
    if (!this.userPubkey) {
      throw new Error("Cannot sign event: NIP-46 signer not connected");
    }

    return new Promise<SignedEvent>((resolve, reject) => {
      const subFilter: Filter = {
        kinds: [BUNKER_KIND],
        authors: [this.bunkerPubkey],
        limit: 10,
      };

      const sub = this.pool.subscribeMany(
        [this.relayUrl],
        subFilter,
        {
          onevent: async (event) => {
            const response = await decryptRpc(
              this.clientSecretHex,
              this.bunkerPubkey,
              event.content,
            );
            if (!response) return;

            if (response.error) {
              sub.close();
              reject(new Error(response.error));
              return;
            }

            if (response.result && typeof response.result === "object") {
              const signedEvent = response.result as SignedEvent;
              if (signedEvent.id && signedEvent.sig) {
                sub.close();
                resolve(signedEvent);
              }
            }
          },
        },
      );

      this.encryptAndSend("sign_event", [draft]).catch((err) => {
        sub.close();
        reject(err);
      });

      setTimeout(() => {
        sub.close();
        reject(new Error("Bunker sign event timed out"));
      }, SIGN_TIMEOUT);
    });
  }

  /**
   * Encrypts content via bunker RPC.
   */
  async encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    if (!this.userPubkey) {
      throw new Error("NIP-46 signer not connected");
    }

    return new Promise<string>((resolve, reject) => {
      const subFilter: Filter = {
        kinds: [BUNKER_KIND],
        authors: [this.bunkerPubkey],
        limit: 10,
      };

      const sub = this.pool.subscribeMany(
        [this.relayUrl],
        subFilter,
        {
          onevent: async (event) => {
            const response = await decryptRpc(
              this.clientSecretHex,
              this.bunkerPubkey,
              event.content,
            );
            if (!response) return;

            if (response.error) {
              sub.close();
              reject(new Error(response.error));
              return;
            }

            if (typeof response.result === "string") {
              sub.close();
              resolve(response.result);
            }
          },
        },
      );

      // Try NIP-44 first, fall back to NIP-04
      this.encryptAndSend("nip44.encrypt", [recipientPubkey, plaintext]).catch(() => {
        this.encryptAndSend("nip04.encrypt", [recipientPubkey, plaintext]).catch((err) => {
          sub.close();
          reject(err);
        });
      });

      setTimeout(() => {
        sub.close();
        reject(new Error("Bunker encrypt timed out"));
      }, CRYPTO_TIMEOUT);
    });
  }

  /**
   * Decrypts content via bunker RPC.
   */
  async decrypt(senderPubkey: string, ciphertext: string): Promise<string | null> {
    if (!this.userPubkey) {
      throw new Error("NIP-46 signer not connected");
    }

    return new Promise<string | null>((resolve) => {
      const subFilter: Filter = {
        kinds: [BUNKER_KIND],
        authors: [this.bunkerPubkey],
        limit: 10,
      };

      const sub = this.pool.subscribeMany(
        [this.relayUrl],
        subFilter,
        {
          onevent: async (event) => {
            const response = await decryptRpc(
              this.clientSecretHex,
              this.bunkerPubkey,
              event.content,
            );
            if (!response) return;

            if (response.error) {
              sub.close();
              resolve(null);
              return;
            }

            if (typeof response.result === "string") {
              sub.close();
              resolve(response.result);
            }
          },
        },
      );

      // Try NIP-44 first, fall back to NIP-04
      this.encryptAndSend("nip44.decrypt", [senderPubkey, ciphertext]).catch(() => {
        this.encryptAndSend("nip04.decrypt", [senderPubkey, ciphertext]).catch(() => {
          sub.close();
          resolve(null);
        });
      });

      setTimeout(() => {
        sub.close();
        resolve(null);
      }, CRYPTO_TIMEOUT);
    });
  }

  /**
   * Sends an encrypted JSON-RPC command to the bunker via the relay.
   */
  private async encryptAndSend(method: string, params: unknown[]): Promise<void> {
    const ciphertext = await encryptRpc(this.clientSecretHex, this.bunkerPubkey, method, params);
    const clientSecretKey = hexToBytes(this.clientSecretHex);
    const eventTemplate = {
      kind: BUNKER_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", this.bunkerPubkey]],
      content: ciphertext,
    };

    const signed = finalizeEvent(eventTemplate, clientSecretKey);
    await this.pool.publish([this.relayUrl], signed);
  }

  private persistSession(): void {
    if (!this.userPubkey) return;
    const data: Nip46PersistedSession = {
      clientSecretHex: this.clientSecretHex,
      clientPubkey: this.clientPubkey,
      bunkerPubkey: this.bunkerPubkey,
      relayUrl: this.relayUrl,
      userPubkey: this.userPubkey,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
      // localStorage may be full
    }
  }

  static restoreFromStorage(): Nip46Signer | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Nip46PersistedSession;
      if (!data.clientSecretHex || !data.bunkerPubkey || !data.relayUrl || !data.userPubkey) {
        return null;
      }
      const signer = new Nip46Signer(data.bunkerPubkey, data.relayUrl, data.clientSecretHex);
      signer.userPubkey = data.userPubkey;
      const npub = nip19.npubEncode(data.userPubkey);
      signer.session = { pubkey: data.userPubkey, npub };
      return signer;
    } catch {
      return null;
    }
  }

  static clearPersistedSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }

  static getPersistedSessionData(): Nip46PersistedSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Nip46PersistedSession;
      if (!data.clientSecretHex || !data.bunkerPubkey || !data.relayUrl || !data.userPubkey) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  close(): void {
    this.pool.close([this.relayUrl]);
  }
}
