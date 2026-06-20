import { useMemo, useState } from "react";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TutorDirectoryQuery } from "../domain/tutorDirectoryQuery";
import { isProfileEmpty } from "../utils/normalize";
import { hasRoleTag, hasSchemaTag, PROFILE_SCHEMA_VERSION } from "../domain/profile";
import {
  tutorMatchesSubject,
  tutorMatchesLanguage,
  tutorHasLocationMode,
  tutorHasFreeSlotsThisWeek,
  tutorIsAvailableNow
} from "../domain/tutorSelectors";
import { useProfileStore } from "../stores/profileStore";

export function useTutorDirectory(
  schedules?: Record<string, { pubkey: string; created_at: number; schedule: import("../domain/schedule").TutorSchedule }>,
  winnerByAllocationKey?: Record<string, SlotOccupancy>
) {
  const tutors = useProfileStore((s) => s.byPubkey);
  const hydrated = useProfileStore((s) => s.hydrated);
  const [directoryQuery, setDirectoryQuery] = useState<TutorDirectoryQuery>({});

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
    loading: !hydrated
  };
}
