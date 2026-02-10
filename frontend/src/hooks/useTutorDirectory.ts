import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "../nostr/client";
import { TutorProfileEvent } from "../types/nostr";
import { normalizeProfile } from "../utils/normalize";

export function useTutorDirectory() {
  const [tutors, setTutors] = useState<Record<string, TutorProfileEvent>>({});
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [30000], limit: 200 },
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
    if (!subjectFilter.trim()) {
      return Object.values(tutors);
    }
    const term = subjectFilter.trim().toLowerCase();
    return Object.values(tutors).filter((entry) =>
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
