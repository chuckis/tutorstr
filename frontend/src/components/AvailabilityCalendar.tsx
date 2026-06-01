import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { buildWeekDays } from "../application/usecases/buildWeekDays";
import { getWeekRangeLabel } from "../application/usecases/getWeekRangeLabel";
import { groupSlotsByDay } from "../application/usecases/groupSlotsByDay";
import { isSameLocalDay } from "../application/usecases/isSameLocalDay";
import { TimeSlot } from "../domain/TimeSlot";

type AvailabilityCalendarProps = {
  slots: TimeSlot[];
  anchor?: Date;
};

const WEEK_STARTS_ON = 1 as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function AvailabilityCalendar({ slots, anchor }: AvailabilityCalendarProps) {
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
  const buckets = useMemo(() => groupSlotsByDay(slots, weekDays), [slots, weekDays]);
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
    <section className="availability-calendar" aria-label={t("schedule.calendar.title")}>
      <div className="availability-calendar-toolbar">
        <button
          type="button"
          className="ghost-action icon-only-button"
          aria-label={t("schedule.calendar.weekPrev")}
          onClick={() => shiftWeek(-7)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="availability-calendar-range" aria-live="polite">
          {weekLabel}
        </div>
        <button
          type="button"
          className="availability-calendar-today"
          onClick={goToToday}
        >
          {t("schedule.calendar.weekToday")}
        </button>
        <button
          type="button"
          className="ghost-action icon-only-button"
          aria-label={t("schedule.calendar.weekNext")}
          onClick={() => shiftWeek(7)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="availability-calendar-grid">
        {weekDays.map((day, index) => {
          const isToday = isSameLocalDay(day, today);
          const daySlots = buckets[index] ?? [];

          return (
            <div
              key={day.toISOString()}
              className={`availability-calendar-day${isToday ? " is-today" : ""}`}
            >
              <div className="availability-calendar-day-header">
                <span className="availability-calendar-weekday">
                  {weekdayShort(index)}
                </span>
                <span className="availability-calendar-day-number">
                  {dayNumber(day)}
                </span>
              </div>
              <div className="availability-calendar-day-body">
                {daySlots.length === 0 ? (
                  <span className="availability-calendar-empty muted">
                    {t("schedule.calendar.emptyDay")}
                  </span>
                ) : (
                  daySlots.map((slot, slotIndex) => (
                    <div
                      key={`${slot.start}-${slotIndex}`}
                      className="availability-slot"
                    >
                      <span className="availability-slot-time">
                        {formatTime(slot.start)}
                        {slot.end ? `–${formatTime(slot.end)}` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="muted availability-calendar-hint">
        {t("schedule.calendar.hint")}
      </p>
    </section>
  );
}
