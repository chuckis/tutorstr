import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";
import { Role, UserProfile, PROFILE_SCHEMA_VERSION } from "../domain/profile";
import { emptyProfile, normalizeProfile, serializeProfile } from "../utils/normalize";

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

export function useTutorProfile(pubkey: string, viewerRole?: Role) {
  const { t } = useI18n();
  const { profileEventRepository } = useRepo();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const latestProfileRef = useRef<UserProfile>(emptyProfile);
  const autoPublishStartedRef = useRef(false);

  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  function buildProfileTags(nextProfile: UserProfile): string[][] {
    const tags: string[][] = [
      ["t", `schema:${PROFILE_SCHEMA_VERSION}`]
    ];

    if (nextProfile.role) {
      tags.push(["t", `role:${nextProfile.role}`]);
    }

    if (nextProfile.availabilityMode) {
      tags.push(["t", `mode:${nextProfile.availabilityMode}`]);
    }

    for (const subject of nextProfile.subjects) {
      tags.push(["t", `subject:${subject}`]);
    }
    for (const language of nextProfile.languages) {
      tags.push(["t", `language:${language}`]);
    }

    return tags;
  }

  useEffect(() => {
    autoPublishStartedRef.current = false;
    setLoading(true);
    const profileStorageKey = `tutorhub:profile:${pubkey}`;
    const stored = localStorage.getItem(profileStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile;
        const normalized = normalizeProfile(parsed);
        latestProfileRef.current = normalized;
        setProfile(normalized);
      } catch {
        // ignore invalid cache
      }
    }

    let profileReceived = false;

    const unsubscribe = profileEventRepository.subscribe(
      pubkey,
      (event) => {
        try {
          const parsed = normalizeProfile(
            JSON.parse(event.content) as Record<string, unknown>,
          );
          latestProfileRef.current = parsed;
          setProfile(parsed);
          localStorage.setItem(profileStorageKey, JSON.stringify(parsed));
          setLastEventId(event.id);
          setLoading(false);
          profileReceived = true;
        } catch {
          // ignore malformed content
        }
      },
    );

    // After the synchronous store replay, check if we got a profile.
    // If not — auto-publish (new user, no profile on relay yet).
    const timer = setTimeout(() => {
      setLoading(false);

      if (profileReceived || autoPublishStartedRef.current) {
        return;
      }

      autoPublishStartedRef.current = true;
      const profileForPublish = { ...latestProfileRef.current };
      if (viewerRole) {
        profileForPublish.role = viewerRole;
      }
      void publishProfile(profileForPublish);
    }, 0);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [pubkey]);

  async function publishProfile(nextProfile: UserProfile) {
    setStatus(t("profile.form.publish"));

    try {
      const eventId = await profileEventRepository.publish(
        pubkey,
        JSON.stringify(serializeProfile(nextProfile)),
        buildProfileTags(nextProfile),
      );
      localStorage.setItem(`tutorhub:profile:${pubkey}`, JSON.stringify(nextProfile));
      latestProfileRef.current = nextProfile;
      setProfile(nextProfile);
      setLastEventId(eventId);
      setStatus(t("profile.form.publish"));
    } catch (error) {
      setStatus(
        toLocalizedErrorMessage(error, t) || t("profile.form.publish"),
      );
    }
  }

  return {
    profile,
    setProfile,
    status,
    loading,
    lastEventId,
    publishProfile,
  };
}
