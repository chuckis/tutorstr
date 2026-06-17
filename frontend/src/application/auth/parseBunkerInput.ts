import { nip19 } from "nostr-tools";

export type ParsedBunkerInput =
  | { type: "nip05"; address: string }
  | { type: "bunker"; bunkerPubkey: string; relayUrls: string[] };

/**
 * Parses a user-provided string into a bunker connection target.
 *
 * Accepted formats:
 * - `bunker://<pubkey>?relay=<relay_url>` or `bunker://<pubkey>` (uses default relays)
 * - `user@domain.com` (NIP-05 — will be resolved via well-known)
 *
 * Returns null if the input is invalid.
 */
export function parseBunkerInput(raw: string): ParsedBunkerInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try bunker:// URI first
  const bunkerMatch = trimmed.match(
    /^bunker:\/\/([0-9a-f]{64})(?:\?relay=(.+))?$/i,
  );
  if (bunkerMatch) {
    const [, pubkey, relayParam] = bunkerMatch;
    const relayUrls = relayParam
      ? relayParam.split(",").map((r) => decodeURIComponent(r.trim()))
      : [];
    return { type: "bunker", bunkerPubkey: pubkey, relayUrls };
  }

  // Try to decode as npub (some implementations accept npub instead of hex)
  try {
    const decoded = nip19.decode(trimmed);
    if (decoded.type === "npub") {
      return {
        type: "bunker",
        bunkerPubkey: decoded.data as string,
        relayUrls: [],
      };
    }
  } catch {
    // Not a bech32 string, continue
  }

  // Try NIP-05 format: user@domain.com
  const nip05Match = trimmed.match(/^([\w.+-]+)@([\w.-]+\.\w+)$/);
  if (nip05Match) {
    return { type: "nip05", address: trimmed };
  }

  return null;
}
