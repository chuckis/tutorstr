import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { ScheduleSlot, TutorSchedule } from "../types/nostr";

const emptySlot: ScheduleSlot = { start: "", end: "" };

type ScheduleFormProps = {
  schedule: TutorSchedule;
  onChange: (next: TutorSchedule) => void;
  onSubmit: () => void;
};

export function ScheduleForm({ schedule, onChange, onSubmit }: ScheduleFormProps) {
  const { t, formatDateTime } = useI18n();
  const [newSlot, setNewSlot] = useState<ScheduleSlot>(emptySlot);

  function addSlot() {
    if (!newSlot.start || !newSlot.end) {
      return;
    }
    onChange({
      ...schedule,
      slots: [...schedule.slots, { start: newSlot.start, end: newSlot.end }]
    });
    setNewSlot(emptySlot);
  }

  function removeSlot(index: number) {
    onChange({
      ...schedule,
      slots: schedule.slots.filter((_, slotIndex) => slotIndex !== index)
    });
  }

  return (
    <form
      className="schedule-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
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
              setNewSlot({ ...newSlot, start: event.target.value })
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

      {schedule.slots.length ? (
        <ul className="slot-list">
          {schedule.slots.map((slot, index) => (
            <li key={`${slot.start}-${index}`}>
              <span>
                {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeSlot(index)}
              >
                {t("schedule.remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("schedule.noSlots")}</p>
      )}

      <button type="submit">{t("schedule.publish")}</button>
    </form>
  );
}
