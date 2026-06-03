import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { TimeSlot, TutorSchedule } from "../hooks/hookTypes";
import { addMinutesToDateTimeLocal } from "../utils/dateTimeLocal";
import { isSlotInPast } from "../domain/TimeSlot";

const emptySlot: TimeSlot = { start: "", end: "" };

type ScheduleFormProps = {
  schedule: TutorSchedule;
  onChange: (next: TutorSchedule) => void;
  onSubmit: () => void;
};

export function ScheduleForm({ schedule, onChange, onSubmit }: ScheduleFormProps) {
  const { t, formatDateTime } = useI18n();
  const [newSlot, setNewSlot] = useState<TimeSlot>(emptySlot);
  const [isDirty, setIsDirty] = useState(false);

  const visibleSlots = useMemo(
    () =>
      schedule.slots
        .map((slot, index) => ({ slot, originalIndex: index }))
        .filter(({ slot }) => !isSlotInPast(slot)),
    [schedule.slots]
  );

  function addSlot() {
    if (!newSlot.start || !newSlot.end) return;
    onChange({
      ...schedule,
      slots: [...schedule.slots, newSlot as TimeSlot]
    });
    setNewSlot(emptySlot);
  }

  function removeSlot(index: number) {
    onChange({
      ...schedule,
      slots: schedule.slots.filter((_, slotIndex) => slotIndex !== index),
    });
    setIsDirty(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
    setIsDirty(false);
  }

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <div className="schedule-header">
        <h3>{t("schedule.availability")}</h3>
        <span className="muted">{schedule.timezone}</span>
      </div>

      <label>
        {t("schedule.timezone")}
        <input
          value={schedule.timezone}
          onChange={(event) =>
            onChange({ ...schedule, timezone: event.target.value })
          }
          placeholder={t("schedule.timezonePlaceholder")}
        />
      </label>

      <div className="slot-row">
        <label>
          {t("schedule.start")}
          <input
            type="datetime-local"
            value={newSlot.start}
            onChange={(event) =>
              setNewSlot({
                start: event.target.value,
                end: addMinutesToDateTimeLocal(event.target.value, 60),
              })
            }
          />
        </label>
        <label>
          {t("schedule.end")}
          <input
            type="datetime-local"
            value={newSlot.end}
            onChange={(event) =>
              setNewSlot({ ...newSlot, end: event.target.value })
            }
          />
        </label>
        <button type="button" className="ghost" onClick={addSlot}>
          {t("schedule.addSlot")}
        </button>
      </div>

      {visibleSlots.length > 0 ? (
        <ul className="slot-list">
          {visibleSlots.map(({ slot, originalIndex }) => (
            <li key={`${slot.start}-${originalIndex}`}>
              <span>
                {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeSlot(originalIndex)}
              >
                {t("schedule.remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("schedule.noSlots")}</p>
      )}

      <div className="schedule-footer">
        <button type="submit">{t("schedule.publish")}</button>
        {isDirty && (
          <span className="schedule-unsaved">{t("schedule.unsavedChanges")}</span>
        )}
      </div>
    </form>
  );
}