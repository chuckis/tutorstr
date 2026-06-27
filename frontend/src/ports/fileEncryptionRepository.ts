export interface FileEncryptionRepository {
  encrypt(file: File): Promise<{ encryptedFile: File; key: string }>;
  decrypt(blob: Blob, key: string): Promise<Blob>;
}
