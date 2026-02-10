import { useState } from "react";
import { ScheduleSlot, TutorSchedule } from "../types/nostr";

const emptySlot: ScheduleSlot = { start: "", end: "" };

type ScheduleFormProps = {
  schedule: TutorSchedule;
  onChange: (next: TutorSchedule) => void;
  onSubmit: () => void;
};

export function ScheduleForm({ schedule, onChange, onSubmit }: ScheduleFormProps) {
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
        <h3>Availability</h3>
        <span className="muted">{schedule.timezone}</span>
      </div>

      <label>
        Timezone
        <input
          value={schedule.timezone}
          onChange={(event) =>
            onChange({ ...schedule, timezone: event.target.value })
          }
          placeholder="UTC"
        />
      </label>

      <div className="slot-row">
        <label>
          Start
          <input
            type="datetime-local"
            value={newSlot.start}
            onChange={(event) =>
              setNewSlot({ ...newSlot, start: event.target.value })
            }
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={newSlot.end}
            onChange={(event) =>
              setNewSlot({ ...newSlot, end: event.target.value })
            }
          />
        </label>
        <button type="button" className="ghost" onClick={addSlot}>
          Add slot
        </button>
      </div>

      {schedule.slots.length ? (
        <ul className="slot-list">
          {schedule.slots.map((slot, index) => (
            <li key={`${slot.start}-${index}`}>
              <span>
                {slot.start} → {slot.end}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => removeSlot(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No slots added yet.</p>
      )}

      <button type="submit">Publish Schedule</button>
    </form>
  );
}
