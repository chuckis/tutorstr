import { describe, expect, it } from "vitest";
import { webCryptoFileEncryption } from "../webCryptoFileEncryption";

describe("webCryptoFileEncryption", () => {
  it("encrypts and decrypts a text file", async () => {
    const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });

    const { encryptedFile, key } = await webCryptoFileEncryption.encrypt(file);

    expect(encryptedFile.name).toBe("hello.txt");
    expect(encryptedFile.size).toBeGreaterThan(0);
    expect(key).toBeTruthy();
    expect(key.length).toBeGreaterThan(0);

    const decryptedBlob = await webCryptoFileEncryption.decrypt(encryptedFile, key);
    const text = await decryptedBlob.text();
    expect(text).toBe("Hello, World!");
  });

  it("encrypts and decrypts a PDF-like file", async () => {
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x68, 0x65, 0x6c, 0x6c, 0x6f]);
    const file = new File([content], "doc.pdf", { type: "application/pdf" });

    const { encryptedFile, key } = await webCryptoFileEncryption.encrypt(file);
    const decryptedBlob = await webCryptoFileEncryption.decrypt(encryptedFile, key);
    const decrypted = new Uint8Array(await decryptedBlob.arrayBuffer());

    expect(Array.from(decrypted)).toEqual(Array.from(content));
  });

  it("encrypts and decrypts an image file", async () => {
    const size = 1024;
    const pixels = new Uint8Array(size);
    for (let i = 0; i < size; i++) pixels[i] = i & 0xff;
    const file = new File([pixels], "img.png", { type: "image/png" });

    const { encryptedFile, key } = await webCryptoFileEncryption.encrypt(file);
    const decryptedBlob = await webCryptoFileEncryption.decrypt(encryptedFile, key);
    const decrypted = new Uint8Array(await decryptedBlob.arrayBuffer());

    expect(decrypted.length).toBe(size);
    expect(Array.from(decrypted)).toEqual(Array.from(pixels));
  });

  it("uses image/png MIME type for upload compatibility", async () => {
    const pdf = new File(["data"], "doc.pdf", { type: "application/pdf" });
    const md = new File(["data"], "readme.md", { type: "text/markdown" });

    const { encryptedFile: ef1 } = await webCryptoFileEncryption.encrypt(pdf);
    const { encryptedFile: ef2 } = await webCryptoFileEncryption.encrypt(md);

    expect(ef1.type).toBe("image/png");
    expect(ef2.type).toBe("image/png");
  });

  it("produces different keys for different files", async () => {
    const file1 = new File(["data1"], "a.txt", { type: "text/plain" });
    const file2 = new File(["data2"], "b.txt", { type: "text/plain" });

    const { key: key1 } = await webCryptoFileEncryption.encrypt(file1);
    const { key: key2 } = await webCryptoFileEncryption.encrypt(file2);

    expect(key1).not.toBe(key2);
  });

  it("produces different ciphertexts for the same content (nonce randomization)", async () => {
    const file = new File(["same content"], "test.txt", { type: "text/plain" });

    const { encryptedFile: ef1 } = await webCryptoFileEncryption.encrypt(file);
    const { encryptedFile: ef2 } = await webCryptoFileEncryption.encrypt(file);

    const buf1 = await ef1.arrayBuffer();
    const buf2 = await ef2.arrayBuffer();

    expect(buf1.byteLength).toBe(buf2.byteLength);

    const bytes1 = new Uint8Array(buf1);
    const bytes2 = new Uint8Array(buf2);
    const same = bytes1.every((b, i) => b === bytes2[i]);
    expect(same).toBe(false);
  });

  it("handles empty file", async () => {
    const file = new File([], "empty.txt", { type: "text/plain" });

    const { encryptedFile, key } = await webCryptoFileEncryption.encrypt(file);
    const decryptedBlob = await webCryptoFileEncryption.decrypt(encryptedFile, key);
    const text = await decryptedBlob.text();

    expect(text).toBe("");
  });

  it("rejects decryption with wrong key", async () => {
    const file = new File(["secret data"], "secret.txt", { type: "text/plain" });

    const { encryptedFile } = await webCryptoFileEncryption.encrypt(file);
    const wrongKey = btoa("x".repeat(32));

    await expect(
      webCryptoFileEncryption.decrypt(encryptedFile, wrongKey)
    ).rejects.toThrow();
  });
});
