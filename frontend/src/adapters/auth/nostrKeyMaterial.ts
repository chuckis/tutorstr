import { nip19 } from "nostr-tools";
import * as nip06 from "nostr-tools/nip06";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import {
  InvalidSecretInputError,
  InvalidWordCountError,
  InvalidMnemonicChecksumError,
  ParsedSecretInput
} from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";

const MNEMONIC_DERIVATION_PATH = "m/44'/1237'/0'/0/0";

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
  return value.trim().toLowerCase();
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
    if (!validateMnemonic(normalized, wordlist)) {
      throw new InvalidMnemonicChecksumError();
    }

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

  if (words.length > 0 && words.length !== 12 && words.length !== 24) {
    throw new InvalidWordCountError();
  }

  throw new InvalidSecretInputError();
}

function generateMnemonicImpl(): string {
  return generateMnemonic(wordlist, 128);
}

function mnemonicToSecretKey(mnemonic: string): string {
  const normalized = mnemonic.trim().toLowerCase();
  const seed = mnemonicToSeedSync(normalized);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(MNEMONIC_DERIVATION_PATH);
  return bytesToHex(child.privateKey!);
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
  parseSecretInput,
  generateMnemonic: generateMnemonicImpl,
  mnemonicToSecretKey
};

export function secretKeyHexToBytes(secretKeyHex: string) {
  return hexToBytes(secretKeyHex);
}
