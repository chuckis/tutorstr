import { FileEncryptionRepository } from "../../ports/fileEncryptionRepository";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 128;

// Blossom servers typically restrict accepted MIME types (e.g. image/*).
// Since the file content is encrypted and opaque on the wire, we use a
// universally accepted MIME type. The original type is preserved in
// MessageAttachment.mimeType for correct display after decryption.
const UPLOAD_MIME = "image/png";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const webCryptoFileEncryption: FileEncryptionRepository = {
  async encrypt(file: File): Promise<{ encryptedFile: File; key: string }> {
    const plaintext = await file.arrayBuffer();

    const cryptoKey = await crypto.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ["encrypt", "decrypt"]
    );

    const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);
    const keyBase64 = arrayBufferToBase64(rawKey);

    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: nonce, tagLength: TAG_LENGTH },
      cryptoKey,
      plaintext
    );

    const combined = new Uint8Array(nonce.length + encrypted.byteLength);
    combined.set(nonce, 0);
    combined.set(new Uint8Array(encrypted), nonce.length);

    const encryptedFile = new File(
      [combined],
      file.name,
      { type: UPLOAD_MIME }
    );

    return { encryptedFile, key: keyBase64 };
  },

  async decrypt(blob: Blob, key: string): Promise<Blob> {
    const rawKey = base64ToArrayBuffer(key);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["decrypt"]
    );

    const data = await blob.arrayBuffer();
    const dataBytes = new Uint8Array(data);

    const nonce = dataBytes.slice(0, NONCE_LENGTH);
    const ciphertext = dataBytes.slice(NONCE_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: nonce, tagLength: TAG_LENGTH },
      cryptoKey,
      ciphertext
    );

    return new Blob([plaintext]);
  }
};
