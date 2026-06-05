import { useEffect, useMemo, useState } from "react";
import { useRepo } from "./RepoContext";
import { TutorProfileEvent } from "../ports/eventTypes";
import { isProfileEmpty, normalizeProfile } from "../utils/normalize";
import { hasRoleTag } from "../domain/profile";

const LOAD_TIMEOUT = 8000;

export function useTutorDirectory() {
  const { profileEventRepository } = useRepo();
  const [tutors, setTutors] = useState<Record<string, TutorProfileEvent>>({});
  const [subjectFilter, setSubjectFilter] = useState<string>("");
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
    setSubjectFilter,
    loading
  };
}
