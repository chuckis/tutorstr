import { useEffect, useMemo, useState } from "react";
import { groupLessonsByTimeline } from "../application/usecases/groupLessonsByTimeline";
import { Lesson } from "../domain/lesson";
import { useLessonRepository } from "./useLessonRepository";

export function useLessons(userId: string, options?: { now?: number }) {
  const lessonRepository = useLessonRepository(userId);
  const now = options?.now ?? Date.now();
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    let isActive = true;

    lessonRepository.getForUser(userId).then((nextLessons) => {
      if (!isActive) {
        return;
      }

      setLessons(nextLessons);
    });

    return () => {
      isActive = false;
    };
  }, [lessonRepository, userId]);

  const lessonMap = useMemo(
    () => lessons.reduce<Record<string, Lesson>>((acc, lesson) => {
        acc[lesson.id] = lesson;
        return acc;
      }, {}),
    [lessons]
  );
  const lessonBuckets = useMemo(() => groupLessonsByTimeline(lessons, now), [lessons, now]);

  return {
    lessons,
    lessonBuckets,
    lessonMap,
    lessonRepository
  };
}
