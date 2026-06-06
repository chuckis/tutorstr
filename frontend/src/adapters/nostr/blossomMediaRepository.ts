import { createUploadAuth } from "blossom-client-sdk/auth";
import { uploadBlob } from "blossom-client-sdk/actions/upload";
import { MediaUploadRepository } from "../../ports/mediaUploadRepository";
import { NostrSigner, SignEventDraft } from "../../ports/nostrSigner";

export const BLOSSOM_STORAGE_KEY = "tutorhub:blossomServer";

function toBlossomSigner(signer: NostrSigner) {
  return async (draft: SignEventDraft) => {
    const event = { ...draft, pubkey: signer.getSession().pubkey };
    return signer.signEvent(event);
  };
}

export const blossomMediaRepository: MediaUploadRepository = {
  async upload(file, serverUrl, signer) {
    const normalized = serverUrl.replace(/\/+$/, "");
    const bSigner = toBlossomSigner(signer);
    const auth = await createUploadAuth(bSigner, file, {});
    const desc = await uploadBlob(normalized, file, { auth });
    return desc.url;
  },

  async uploadMultiple(files, serverUrl, signer) {
    const normalized = serverUrl.replace(/\/+$/, "");
    const bSigner = toBlossomSigner(signer);

    const results = await Promise.all(
      files.map(async (file) => {
        const auth = await createUploadAuth(bSigner, file, {});
        const desc = await uploadBlob(normalized, file, { auth });
        return desc.url;
      })
    );

    return results;
  }
};
