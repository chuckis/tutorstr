import { useState, useCallback } from "react";
import { useRepo } from "./RepoContext";
import { blossomMediaRepository, BLOSSOM_STORAGE_KEY } from "../adapters/nostr/blossomMediaRepository";
import { UserProfile } from "../hooks/hookTypes";

export type UploadStatus = { type: "idle" } | { type: "uploading" } | { type: "success"; url: string } | { type: "error"; message: string };

const DEFAULT_BLOSSOM_URL = "https://blossom.nostr.build";

export function useBlossomConfig() {
  const { signerManager } = useRepo();
  const [blossomUrl, setBlossomUrlState] = useState(
    () => {
      const stored = localStorage.getItem(BLOSSOM_STORAGE_KEY);
      if (stored) return stored;
      localStorage.setItem(BLOSSOM_STORAGE_KEY, DEFAULT_BLOSSOM_URL);
      return DEFAULT_BLOSSOM_URL;
    }
  );
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: "idle" });

  const clearUploadStatus = useCallback(() => setUploadStatus({ type: "idle" }), []);

  const setBlossomUrl = useCallback((url: string) => {
    setBlossomUrlState(url);
    if (url) {
      localStorage.setItem(BLOSSOM_STORAGE_KEY, url);
    } else {
      localStorage.removeItem(BLOSSOM_STORAGE_KEY);
    }
  }, []);

  const uploadAvatar = useCallback(async (
    file: File,
    profile: UserProfile,
    onProfileChange: (p: UserProfile) => void
  ) => {
    setUploadStatus({ type: "uploading" });
    try {
      const signer = signerManager.getSigner();
      if (!signer) throw new Error("No signer available");
      const serverUrl = blossomUrl || localStorage.getItem(BLOSSOM_STORAGE_KEY);
      if (!serverUrl) throw new Error("No Blossom server configured");
      const result = await blossomMediaRepository.upload(file, serverUrl, signer);
      onProfileChange({ ...profile, avatarUrl: result.url });
      setUploadStatus({ type: "success", url: result.url });
    } catch (error) {
      setUploadStatus({ type: "error", message: error instanceof Error ? error.message : "Upload failed" });
      throw error;
    }
  }, [signerManager, blossomUrl]);

  return { blossomUrl, setBlossomUrl, uploadAvatar, uploadStatus, clearUploadStatus };
}
