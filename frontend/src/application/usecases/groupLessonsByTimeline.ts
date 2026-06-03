import { Lesson } from "../../domain/lesson";

export function groupLessonsByTimeline(
  lessons: Lesson[],
  now: number = Date.now()
) {
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

  upcoming.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  past.sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));

  return { upcoming, past };
}
