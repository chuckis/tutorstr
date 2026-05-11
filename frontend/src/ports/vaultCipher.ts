export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  salt: string;
  kdfIterations: number;
};

export type VaultCipher = {
  encrypt: (secretKeyHex: string, passphrase: string) => Promise<EncryptedPayload>;
  decrypt: (payload: EncryptedPayload, passphrase: string) => Promise<string>;
};
