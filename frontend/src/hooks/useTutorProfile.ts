import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";
import { TutorProfile } from "../domain/profile";
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
  const { profileEventRepository } = useRepo();
  const [profile, setProfile] = useState<TutorProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");
  const latestProfileRef = useRef<TutorProfile>(emptyProfile);
  const autoPublishStartedRef = useRef(false);

  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  function buildProfileTags(nextProfile: TutorProfile) {
    return [
      ["t", "role:tutor"],
      ...nextProfile.subjects.map((subject) => ["t", `subject:${subject}`]),
      ...nextProfile.languages.map((language) => ["t", `language:${language}`])
    ];
  }

  useEffect(() => {
    autoPublishStartedRef.current = false;
    const profileStorageKey = `tutorhub:profile:${pubkey}`;
    const stored = localStorage.getItem(profileStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TutorProfile;
        const normalized = normalizeProfile(parsed);
        latestProfileRef.current = normalized;
        setProfile(normalized);
      } catch {
        // ignore invalid cache
      }
    }

    const unsubscribe = profileEventRepository.subscribe(
      pubkey,
      (event) => {
        try {
          const parsed = normalizeProfile(
            JSON.parse(event.content) as TutorProfile
          );
          latestProfileRef.current = parsed;
          setProfile(parsed);
          localStorage.setItem(profileStorageKey, JSON.stringify(parsed));
          setLastEventId(event.id);
        } catch {
          // ignore malformed content
        }
      },
      {
        limit: 1,
        onEose: () => {
          if (autoPublishStartedRef.current) {
            return;
          }

          autoPublishStartedRef.current = true;
          void publishProfile(latestProfileRef.current);
        }
      }
    );

    return () => unsubscribe();
  }, [pubkey]);

  async function publishProfile(nextProfile: TutorProfile) {
    setStatus(t("profile.form.publish"));

    try {
      const eventId = await profileEventRepository.publish(
        pubkey,
        JSON.stringify(nextProfile),
        buildProfileTags(nextProfile)
      );
      localStorage.setItem(`tutorhub:profile:${pubkey}`, JSON.stringify(nextProfile));
      latestProfileRef.current = nextProfile;
      setProfile(nextProfile);
      setLastEventId(eventId);
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
