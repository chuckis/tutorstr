import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { TimeSlot, TutorSchedule } from "../hooks/hookTypes";
import { addMinutesToDateTimeLocal, slotDurationMinutes } from "../utils/dateTimeLocal";
import { isSlotInPast } from "../domain/TimeSlot";
import { Button } from "./ui/Button";
import { HintIcon } from "./ui/HintIcon";
import { Input } from "./ui/Input";

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
    setIsDirty(true);
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
        <HintIcon
          hintId="schedule-slots"
          title={t("hints.schedule-slots.title")}
          content={t("hints.schedule-slots.content")}
        />
      </div>

      <div className="slot-row">
        <Input
          label={t("schedule.start")}
          type="datetime-local"
          value={newSlot.start}
          onChange={(event) =>
            setNewSlot({
              start: event.target.value,
              end: addMinutesToDateTimeLocal(event.target.value, 60),
            })
          }
        />
        <Input
          label={t("schedule.end")}
          type="datetime-local"
          value={newSlot.end}
          onChange={(event) =>
            setNewSlot({ ...newSlot, end: event.target.value })
          }
        />
        <Button variant="ghost" type="button" onClick={addSlot}>
          {t("schedule.addSlot")}
        </Button>
      </div>

      {visibleSlots.length > 0 ? (
        <ul className="slot-list">
          {visibleSlots.map(({ slot, originalIndex }) => (
            <li key={originalIndex}>
              <span>
                {formatDateTime(slot.start)} · {t("lessons.minutes", { count: slotDurationMinutes(slot.start, slot.end) })}
              </span>
              <Button variant="ghost" type="button" onClick={() => removeSlot(originalIndex)}>
                {t("schedule.remove")}
              </Button>
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
