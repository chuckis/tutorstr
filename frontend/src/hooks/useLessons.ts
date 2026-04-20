import { useMemo } from "react";
import { lessonFromNostr } from "../adapters/nostr/lessonAdapter";
import { Lesson } from "../domain/lesson";
import { useLessonAgreementsForUser } from "./useLessonAgreementsForUser";
import { useLessonRepository } from "./useLessonRepository";

export function useLessons(userId: string, options?: { now?: number }) {
  const { agreements, list } = useLessonAgreementsForUser(userId);
  const lessonRepository = useLessonRepository(userId);
  const now = options?.now ?? Date.now();

  const lessons = useMemo(() => list.map(lessonFromNostr), [list]);
  const lessonMap = useMemo(
    () =>
      Object.values(agreements).reduce<Record<string, Lesson>>((acc, event) => {
        acc[event.lessonId] = lessonFromNostr(event);
        return acc;
      }, {}),
    [agreements]
  );
  const lessonBuckets = useMemo(() => {
    const upcoming: Lesson[] = [];
    const past: Lesson[] = [];

    lessons.forEach((lesson) => {
      const startsAt = Date.parse(lesson.scheduledAt);
      const isFutureOrUnknown = Number.isNaN(startsAt) || startsAt >= now;
      const isScheduled = lesson.status === "scheduled";

      if (isScheduled && isFutureOrUnknown) {
        upcoming.push(lesson);
        return;
      }
      past.push(lesson);
    });

    return { upcoming, past };
  }, [lessons, now]);

  return {
    lessons,
    lessonBuckets,
    lessonMap,
    lessonRepository
  };
}
