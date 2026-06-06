import { NostrSigner } from "./nostrSigner";

export interface MediaUploadRepository {
  upload(
    file: File,
    serverUrl: string,
    signer: NostrSigner
  ): Promise<string>;
  uploadMultiple(
    files: File[],
    serverUrl: string,
    signer: NostrSigner
  ): Promise<string[]>;
}
