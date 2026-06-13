import { useCallback } from "react";
import { useRepo } from "./RepoContext";
import { BLOSSOM_STORAGE_KEY } from "../adapters/nostr/blossomMediaRepository";

const DEFAULT_BLOSSOM_URL = "https://blossom.nostr.build";

function getBlossomUrl(): string {
  const stored = localStorage.getItem(BLOSSOM_STORAGE_KEY);
  if (stored) return stored;
  localStorage.setItem(BLOSSOM_STORAGE_KEY, DEFAULT_BLOSSOM_URL);
  return DEFAULT_BLOSSOM_URL;
}

export function useEditorImageUpload() {
  const { mediaUploadRepository, signerManager } = useRepo();

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const signer = signerManager.getSigner();
    if (!signer) {
      throw new Error("Authentication required");
    }

    const serverUrl = getBlossomUrl();
    const result = await mediaUploadRepository.upload(file, serverUrl, signer);
    return result.url;
  }, [mediaUploadRepository, signerManager]);

  return { uploadImage };
}
