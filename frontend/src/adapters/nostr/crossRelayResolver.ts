import { createNostrRelayListRepository } from "./relayListRepository";
import { DEFAULT_RELAYS } from "../../nostr/config";
import {
  RELAY_LIST_CACHE_TTL_MS,
  RELAY_LIST_CACHE_PREFIX,
} from "../../domain/relayList";

interface CacheEntry {
  relays: string[];
  cachedAt: number;
}

function readCache(pubkey: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(RELAY_LIST_CACHE_PREFIX + pubkey);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(pubkey: string, relays: string[]): void {
  const entry: CacheEntry = { relays, cachedAt: Date.now() };
  try {
    localStorage.setItem(RELAY_LIST_CACHE_PREFIX + pubkey, JSON.stringify(entry));
  } catch {
  }
}

function isCacheFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt < RELAY_LIST_CACHE_TTL_MS;
}

export async function resolveRelaysForUser(pubkey: string): Promise<string[]> {
  const cached = readCache(pubkey);
  if (cached && isCacheFresh(cached)) {
    return cached.relays;
  }

  const repo = createNostrRelayListRepository();
  const relayList = await repo.fetchRelayList(pubkey);

  if (!relayList || relayList.relays.length === 0) {
    return DEFAULT_RELAYS;
  }

  const urls = [
    ...new Set(relayList.relays.map((r) => r.url)),
  ];

  writeCache(pubkey, urls);
  return urls;
}

export function clearRelayListCache(pubkey?: string): void {
  if (pubkey) {
    localStorage.removeItem(RELAY_LIST_CACHE_PREFIX + pubkey);
    return;
  }

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(RELAY_LIST_CACHE_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
