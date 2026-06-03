import { useState, useCallback } from "react";
import { useRepo } from "./RepoContext";
import { blossomMediaRepository, BLOSSOM_STORAGE_KEY } from "../adapters/nostr/blossomMediaRepository";
import { TutorProfile } from "../hooks/hookTypes";

export function useBlossomConfig() {
  const { signerManager } = useRepo();
  const [blossomUrl, setBlossomUrlState] = useState(
    () => localStorage.getItem(BLOSSOM_STORAGE_KEY) || ""
  );

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
    profile: TutorProfile,
    onProfileChange: (p: TutorProfile) => void
  ) => {
    const signer = signerManager.getSigner();
    if (!signer) throw new Error("No signer available");
    const serverUrl = localStorage.getItem(BLOSSOM_STORAGE_KEY);
    if (!serverUrl) throw new Error("No Blossom server configured");
    const url = await blossomMediaRepository.upload(file, serverUrl, signer);
    onProfileChange({ ...profile, avatarUrl: url });
  }, [signerManager]);

  return { blossomUrl, setBlossomUrl, uploadAvatar };
}
