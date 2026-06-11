import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { buildWeekDays, getWeekRangeLabel, isSameLocalDay } from "../utils/calendar";
import { Lesson } from "../hooks/hookTypes";
import { Button } from "./ui/Button";

type LessonsCalendarProps = {
  lessons: Lesson[];
  onSelectLesson?: (lesson: Lesson) => void;
  anchor?: Date;
};

const WEEK_STARTS_ON = 1 as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function groupLessonsByDay(lessons: Lesson[], weekDays: Date[]): Lesson[][] {
  const buckets: Lesson[][] = weekDays.map(() => []);

  for (const lesson of lessons) {
    const startDate = new Date(lesson.scheduledAt);
    if (Number.isNaN(startDate.getTime())) {
      continue;
    }

    const dayIndex = weekDays.findIndex((day) => isSameLocalDay(day, startDate));
    if (dayIndex === -1) {
      continue;
    }

    buckets[dayIndex].push(lesson);
  }

  for (const bucket of buckets) {
    bucket.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  return buckets;
}

export function LessonsCalendar({
  lessons,
  onSelectLesson,
  anchor
}: LessonsCalendarProps) {
  const { t, locale, formatTime } = useI18n();
  const today = useMemo(() => startOfDay(new Date()), []);
  const initialAnchor = useMemo(
    () => startOfDay(anchor ?? new Date()),
    [anchor]
  );
  const [currentAnchor, setCurrentAnchor] = useState<Date>(initialAnchor);

  const weekDays = useMemo(
    () => buildWeekDays(currentAnchor, WEEK_STARTS_ON),
    [currentAnchor]
  );
  const buckets = useMemo(
    () => groupLessonsByDay(lessons, weekDays),
    [lessons, weekDays]
  );
  const weekLabel = useMemo(
    () => getWeekRangeLabel(weekDays, locale),
    [weekDays, locale]
  );

  const weekdayShort = (dayIndex: number): string => {
    const reference = new Date(2024, 0, 1);
    reference.setDate(reference.getDate() + dayIndex);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(reference);
  };

  const dayNumber = (date: Date): string =>
    new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);

  function shiftWeek(days: number) {
    setCurrentAnchor((previous) => new Date(previous.getTime() + days * MS_PER_DAY));
  }

  function goToToday() {
    setCurrentAnchor(startOfDay(new Date()));
  }

  return (
    <section className="lessons-calendar" aria-label={t("lessons.calendar.title")}>
      <div className="lessons-calendar-toolbar">
        <Button variant="ghost" className="ui-btn--icon-only" aria-label={t("lessons.calendar.weekPrev")} onClick={() => shiftWeek(-7)}>
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <div className="lessons-calendar-range" aria-live="polite">
          {weekLabel}
        </div>
        <Button variant="ghost"
          type="button"
          className="lessons-calendar-today"
          onClick={goToToday}
        >
          {t("lessons.calendar.weekToday")}
        </Button>
        <Button variant="ghost" className="ui-btn--icon-only" aria-label={t("lessons.calendar.weekNext")} onClick={() => shiftWeek(7)}>
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>

      <div className="lessons-calendar-grid">
        {weekDays.map((day, index) => {
          const isToday = isSameLocalDay(day, today);
          const dayLessons = buckets[index] ?? [];

          return (
            <div
              key={day.toISOString()}
              className={`lessons-calendar-day${isToday ? " is-today" : ""}`}
            >
              <div className="lessons-calendar-day-header">
                <span className="lessons-calendar-weekday">
                  {weekdayShort(index)}
                </span>
                <span className="lessons-calendar-day-number">
                  {dayNumber(day)}
                </span>
              </div>
              <div className="lessons-calendar-day-body">
                {dayLessons.length === 0 ? (
                  <span className="lessons-calendar-empty muted">
                    {t("lessons.calendar.emptyDay")}
                  </span>
                ) : (
                  dayLessons.map((lesson) => {
                    const title = lesson.subject || t("lessons.defaultTitle");
                    return (
                      <Button variant="ghost"
                        key={lesson.id}
                        type="button"
                        className="lessons-calendar-lesson"
                        onClick={() => onSelectLesson?.(lesson)}
                      >
                        <span className="lessons-calendar-lesson-time">
                          {formatTime(lesson.scheduledAt)}
                        </span>
                        <span className="lessons-calendar-lesson-title">
                          {title}
                        </span>
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
