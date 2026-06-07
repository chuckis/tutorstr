import { NostrSigner } from "./nostrSigner";

export type UploadResult = {
  url: string;
  thumbnailUrl?: string;
};

export interface MediaUploadRepository {
  upload(
    file: File,
    serverUrl: string,
    signer: NostrSigner
  ): Promise<UploadResult>;
  uploadMultiple(
    files: File[],
    serverUrl: string,
    signer: NostrSigner
  ): Promise<UploadResult[]>;
}
