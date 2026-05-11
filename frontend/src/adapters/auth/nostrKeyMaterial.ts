import { nip19 } from "nostr-tools";
import * as nip06 from "nostr-tools/nip06";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import {
  InvalidSecretInputError,
  ParsedSecretInput
} from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new InvalidSecretInputError();
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function normalizeSecretInput(value: string) {
  return value.trim();
}

async function parseSecretInput(value: string): Promise<ParsedSecretInput> {
  const normalized = normalizeSecretInput(value);
  if (!normalized) {
    throw new InvalidSecretInputError();
  }

  if (normalized.startsWith("nsec1")) {
    const decoded = nip19.decode(normalized);
    if (decoded.type !== "nsec") {
      throw new InvalidSecretInputError();
    }

    return {
      format: "nsec",
      secretKeyHex: bytesToHex(decoded.data as Uint8Array)
    };
  }

  if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return {
      format: "hex",
      secretKeyHex: normalized.toLowerCase()
    };
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 12 || words.length === 24) {
    try {
      const secretKey = nip06.privateKeyFromSeedWords(normalized, "", 0);
      return {
        format: "seed",
        secretKeyHex: bytesToHex(secretKey)
      };
    } catch {
      throw new InvalidSecretInputError();
    }
  }

  throw new InvalidSecretInputError();
}

export const nostrKeyMaterial: NostrKeyMaterial = {
  generateSecretKey() {
    return bytesToHex(generateSecretKey());
  },
  derivePublicKey(secretKeyHex) {
    return getPublicKey(hexToBytes(secretKeyHex));
  },
  encodeNsec(secretKeyHex) {
    return nip19.nsecEncode(hexToBytes(secretKeyHex));
  },
  encodeNpub(pubkey) {
    return nip19.npubEncode(pubkey);
  },
  parseSecretInput
};

export function secretKeyHexToBytes(secretKeyHex: string) {
  return hexToBytes(secretKeyHex);
}
