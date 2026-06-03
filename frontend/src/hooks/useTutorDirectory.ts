import { useEffect, useMemo, useState } from "react";
import { useRepo } from "./RepoContext";
import { TutorProfileEvent } from "../ports/eventTypes";
import { isProfileEmpty, normalizeProfile } from "../utils/normalize";
import { hasRoleTag } from "../domain/profile";

export function useTutorDirectory() {
  const { profileEventRepository } = useRepo();
  const [tutors, setTutors] = useState<Record<string, TutorProfileEvent>>({});
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  useEffect(() => {
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
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTutors = useMemo(() => {
    const visibleTutors = Object.values(tutors).filter(
      (entry) => !isProfileEmpty(entry.profile)
    );

    const withoutStudents = visibleTutors.filter(
      (entry) => !hasRoleTag(entry.tags, "student")
    );

    if (!subjectFilter.trim()) {
      return withoutStudents;
    }
    const term = subjectFilter.trim().toLowerCase();
    return withoutStudents.filter((entry) =>
      entry.profile.subjects.some((subject) =>
        subject.toLowerCase().includes(term)
      )
    );
  }, [subjectFilter, tutors]);

  return {
    tutors,
    filteredTutors,
    subjectFilter,
    setSubjectFilter
  };
}
