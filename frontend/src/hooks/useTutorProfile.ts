import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";
import { TutorProfile } from "../types/nostr";
import { emptyProfile, normalizeProfile } from "../utils/normalize";

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

export function useTutorProfile(pubkey: string) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<TutorProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");

  useEffect(() => {
    const profileStorageKey = `tutorhub:profile:${pubkey}`;
    const stored = localStorage.getItem(profileStorageKey);
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
          localStorage.setItem(profileStorageKey, JSON.stringify(parsed));
          setLastEventId(event.id);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  async function publishProfile(nextProfile: TutorProfile) {
    setStatus(t("profile.form.publish"));

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
      localStorage.setItem(`tutorhub:profile:${pubkey}`, JSON.stringify(nextProfile));
      setLastEventId(published.id);
      setStatus(t("profile.form.publish"));
    } catch (error) {
      setStatus(
        toLocalizedErrorMessage(error, t) || t("profile.form.publish")
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
