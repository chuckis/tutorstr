import { getPublicKey, nip44 } from "nostr-tools";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export function getBotPubkey(privateKeyHex: string): string {
  return getPublicKey(hexToBytes(privateKeyHex));
}

export function getConversationKey(
  privateKeyHex: string,
  recipientPubkey: string,
): Uint8Array {
  return nip44.v2.utils.getConversationKey(hexToBytes(privateKeyHex), recipientPubkey);
}

export function encryptNip44(
  privateKeyHex: string,
  recipientPubkey: string,
  plaintext: string,
): string {
  const key = getConversationKey(privateKeyHex, recipientPubkey);
  return nip44.v2.encrypt(plaintext, key);
}

export function decryptNip44(
  privateKeyHex: string,
  senderPubkey: string,
  ciphertext: string,
): string {
  const key = getConversationKey(privateKeyHex, senderPubkey);
  return nip44.v2.decrypt(ciphertext, key);
}
