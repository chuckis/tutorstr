import { useEffect, useState } from "react";
import { nostrClient } from "../nostr/client";
import { TutorProfile } from "../types/nostr";
import { emptyProfile, normalizeProfile } from "../utils/normalize";

const PROFILE_STORAGE = "tutorhub:profile";

export function useTutorProfile(pubkey: string) {
  const [profile, setProfile] = useState<TutorProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_STORAGE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TutorProfile;
        setProfile(normalizeProfile(parsed));
      } catch {
        // ignore invalid cache
      }
    }

    const unsubscribe = nostrClient.subscribe(
      { kinds: [30000], authors: [pubkey], limit: 1 },
      (event) => {
        try {
          const parsed = normalizeProfile(
            JSON.parse(event.content) as TutorProfile
          );
          setProfile(parsed);
          localStorage.setItem(PROFILE_STORAGE, JSON.stringify(parsed));
          setLastEventId(event.id);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  async function publishProfile(nextProfile: TutorProfile) {
    setStatus("Publishing...");

    const tags: string[][] = [
      ["t", "role:tutor"],
      ...nextProfile.subjects.map((subject) => ["t", `subject:${subject}`]),
      ...nextProfile.languages.map((language) => ["t", `language:${language}`])
    ];

    try {
      const published = await nostrClient.publishReplaceableEvent(
        30000,
        JSON.stringify(nextProfile),
        tags
      );
      localStorage.setItem(PROFILE_STORAGE, JSON.stringify(nextProfile));
      setLastEventId(published.id);
      setStatus("Profile published.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to publish profile."
      );
    }
  }

  return {
    profile,
    setProfile,
    status,
    lastEventId,
    publishProfile
  };
}
