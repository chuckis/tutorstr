import { createUploadAuth } from "blossom-client-sdk/auth";
import { uploadBlob } from "blossom-client-sdk/actions/upload";
import { MediaUploadRepository, UploadResult } from "../../ports/mediaUploadRepository";
import { createThumbnail } from "../media/createThumbnail";
import { stripExif } from "../media/stripExif";
import { NostrSigner, SignEventDraft } from "../../ports/nostrSigner";

export const BLOSSOM_STORAGE_KEY = "tutorhub:blossomServer";

function toBlossomSigner(signer: NostrSigner) {
  return async (draft: SignEventDraft) => {
    const event = { ...draft, pubkey: signer.getSession().pubkey };
    return signer.signEvent(event);
  };
}

async function uploadFile(
  file: File,
  normalizedUrl: string,
  bSigner: ReturnType<typeof toBlossomSigner>
): Promise<string> {
  const clean = file.type.startsWith("image/") ? await stripExif(file) : file;
  const auth = await createUploadAuth(bSigner, clean, {});
  const desc = await uploadBlob(normalizedUrl, clean, { auth });
  return desc.url;
}

async function tryUploadThumbnail(
  file: File,
  normalizedUrl: string,
  bSigner: ReturnType<typeof toBlossomSigner>
): Promise<string | undefined> {
  try {
    const thumbFile = await createThumbnail(file, 256);
    if (!thumbFile) return undefined;
    return await uploadFile(thumbFile, normalizedUrl, bSigner);
  } catch (err) {
    console.warn("Thumbnail upload failed, falling back to original", err);
    return undefined;
  }
}

export const blossomMediaRepository: MediaUploadRepository = {
  async upload(file, serverUrl, signer) {
    const normalized = serverUrl.replace(/\/+$/, "");
    const bSigner = toBlossomSigner(signer);

    const url = await uploadFile(file, normalized, bSigner);
    const thumbnailUrl = await tryUploadThumbnail(file, normalized, bSigner);

    return { url, thumbnailUrl };
  },

  async uploadMultiple(files, serverUrl, signer) {
    const normalized = serverUrl.replace(/\/+$/, "");
    const bSigner = toBlossomSigner(signer);

    const results = await Promise.all(
      files.map(async (file) => {
        const url = await uploadFile(file, normalized, bSigner);
        const thumbnailUrl = await tryUploadThumbnail(file, normalized, bSigner);
        return { url, thumbnailUrl } satisfies UploadResult;
      })
    );

    return results;
  }
};
