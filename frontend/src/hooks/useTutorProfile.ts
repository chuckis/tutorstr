import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";
import { Role, UserProfile, PROFILE_SCHEMA_VERSION } from "../domain/profile";
import { emptyProfile, normalizeProfile, serializeProfile } from "../utils/normalize";
import { useProfileStore } from "../stores/profileStore";

const AUTOPUBLISH_TIMEOUT_MS = 8000;

// Tag prefixes that the app manages — everything else is preserved.
const MANAGED_TAG_PREFIXES = ["schema:", "role:", "mode:", "subject:", "language:"];

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
  const storeProfile = useProfileStore((s) => s.byPubkey[pubkey]?.profile ?? emptyProfile);
  const [profile, setProfile] = useState<UserProfile>(storeProfile);
  const [status, setStatus] = useState<string>("");
  const [lastEventId, setLastEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const latestProfileRef = useRef<UserProfile>(profile);
  const autoPublishStartedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with store when new profile arrives
  useEffect(() => {
    setProfile(storeProfile);
  }, [storeProfile]);

  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  function buildProfileTags(nextProfile: UserProfile, existingTags: string[][] = []): string[][] {
    // Preserve existing tags that are NOT managed by the app
    const preserved = existingTags.filter(([k, v]) => {
      if (k !== "t") return true;
      return !MANAGED_TAG_PREFIXES.some(prefix => v.startsWith(prefix));
    });

    // Build fresh app-managed tags
    const appTags: string[][] = [
      ["t", `schema:${PROFILE_SCHEMA_VERSION}`]
    ];

    if (nextProfile.role) {
      appTags.push(["t", `role:${nextProfile.role}`]);
    }

    if (nextProfile.availabilityMode) {
      appTags.push(["t", `mode:${nextProfile.availabilityMode}`]);
    }

    for (const subject of nextProfile.subjects) {
      appTags.push(["t", `subject:${subject}`]);
    }
    for (const language of nextProfile.languages) {
      appTags.push(["t", `language:${language}`]);
    }

    return [...preserved, ...appTags];
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
        
        // Immediate auto-publish if profile has meaningful data
        if (normalized.name || normalized.subjects?.length || normalized.hourlyRate) {
          autoPublishStartedRef.current = true;
          const forPublish = { ...normalized };
          if (viewerRole) forPublish.role = viewerRole;
          void publishProfile(forPublish);
        }
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

          if (profileReceived) return;
          profileReceived = true;

          if (autoPublishStartedRef.current) {
            autoPublishStartedRef.current = false;
            const merged = viewerRole ? { ...parsed, role: viewerRole } : parsed;
            void publishProfile(merged);
          } else if (viewerRole && parsed.role !== viewerRole) {
            autoPublishStartedRef.current = true;
            const merged = { ...parsed, role: viewerRole };
            void publishProfile(merged);
          }
        } catch {
          // ignore malformed content
        }
      },
    );

    timerRef.current = setTimeout(() => {
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
    }, AUTOPUBLISH_TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      unsubscribe();
    };
  }, [pubkey]);

  async function publishProfile(nextProfile: UserProfile) {
    setStatus(t("profile.form.publish"));

    // Fetch existing event data from store to preserve unknown fields/tags
    const existingEntry = useProfileStore.getState().byPubkey[pubkey];
    const existingContent = existingEntry?.content
      ? JSON.parse(existingEntry.content) as Record<string, unknown>
      : undefined;
    const existingTags = existingEntry?.tags ?? [];

    try {
      const eventId = await profileEventRepository.publish(
        pubkey,
        JSON.stringify(serializeProfile(nextProfile, existingContent)),
        buildProfileTags(nextProfile, existingTags),
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
