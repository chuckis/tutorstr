import { useEffect, useMemo, useState } from "react";
import { useRepo } from "./RepoContext";
import { UserProfileEvent, TutorScheduleEvent } from "../ports/eventTypes";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TutorDirectoryQuery } from "../domain/tutorDirectoryQuery";
import { isProfileEmpty, normalizeProfile } from "../utils/normalize";
import { hasRoleTag, hasSchemaTag, PROFILE_SCHEMA_VERSION } from "../domain/profile";
import {
  tutorMatchesSubject,
  tutorMatchesLanguage,
  tutorHasLocationMode,
  tutorHasFreeSlotsThisWeek,
  tutorIsAvailableNow
} from "../domain/tutorSelectors";

const LOAD_TIMEOUT = 8000;

export function useTutorDirectory(
  schedules?: Record<string, TutorScheduleEvent>,
  winnerByAllocationKey?: Record<string, SlotOccupancy>
) {
  const { profileEventRepository } = useRepo();
  const [tutors, setTutors] = useState<Record<string, UserProfileEvent>>({});
  const [directoryQuery, setDirectoryQuery] = useState<TutorDirectoryQuery>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);

    const unsubscribe = profileEventRepository.subscribeAll(
      (event) => {
        try {
          const parsed = normalizeProfile(JSON.parse(event.content));
          setTutors((prev) => {
            const existing = prev[event.pubkey];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }
            return {
              ...prev,
              [event.pubkey]: {
                pubkey: event.pubkey,
                created_at: event.created_at,
                tags: event.tags,
                profile: parsed
              }
            };
          });
          setLoading(false);
          clearTimeout(timer);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const occupiedKeys = useMemo(() => {
    if (!winnerByAllocationKey) return new Set<string>();
    return new Set(Object.keys(winnerByAllocationKey));
  }, [winnerByAllocationKey]);

  const filteredTutors = useMemo(() => {
    const entries = Object.values(tutors).filter(
      (entry) => !isProfileEmpty(entry.profile)
    ).filter(
      (entry) => hasSchemaTag(entry.tags, PROFILE_SCHEMA_VERSION)
    ).filter(
      (entry) => entry.profile.role === "tutor" || hasRoleTag(entry.tags, "tutor")
    );

    const { subject, language, locationMode, availableNow, hasFreeSlotsThisWeek } = directoryQuery;

    return entries.filter((entry) => {
      const p = entry.profile;
      if (!tutorMatchesSubject(p, subject || "")) return false;
      if (!tutorMatchesLanguage(p, language || "")) return false;
      if (!tutorHasLocationMode(p, locationMode)) return false;

      if (availableNow || hasFreeSlotsThisWeek) {
        const schedule = schedules?.[entry.pubkey]?.schedule;
        if (availableNow && !tutorIsAvailableNow(schedule, entry.pubkey, occupiedKeys)) return false;
        if (hasFreeSlotsThisWeek && !tutorHasFreeSlotsThisWeek(schedule, entry.pubkey, occupiedKeys)) return false;
      }

      return true;
    });
  }, [directoryQuery, tutors, schedules, occupiedKeys]);

  return {
    tutors,
    filteredTutors,
    directoryQuery,
    setDirectoryQuery,
    loading
  };
}
