import { useState } from "react";
import { ProgressEntry } from "../types/nostr";

const emptyEntry: ProgressEntry = {
  topic: "",
  notes: "",
  score: undefined,
  bookingId: ""
};

type ProgressEntryFormProps = {
  onSubmit: (entry: ProgressEntry) => void;
};

export function ProgressEntryForm({ onSubmit }: ProgressEntryFormProps) {
  const [entry, setEntry] = useState<ProgressEntry>(emptyEntry);

  return (
    <form
      className="progress-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!entry.topic.trim()) {
          return;
        }
        onSubmit(entry);
        setEntry(emptyEntry);
      }}
    >
      <h3>Progress log</h3>
      <label>
        Topic
        <input
          value={entry.topic}
          onChange={(event) => setEntry({ ...entry, topic: event.target.value })}
          placeholder="Lesson focus"
        />
      </label>
      <label>
        Notes
        <textarea
          rows={3}
          value={entry.notes}
          onChange={(event) => setEntry({ ...entry, notes: event.target.value })}
          placeholder="What did you work on?"
        />
      </label>
      <label>
        Score (optional)
        <input
          type="number"
          min="0"
          max="10"
          value={entry.score ?? ""}
          onChange={(event) =>
            setEntry({
              ...entry,
              score: event.target.value ? Number(event.target.value) : undefined
            })
          }
        />
      </label>
      <label>
        Booking ID (optional)
        <input
          value={entry.bookingId}
          onChange={(event) =>
            setEntry({ ...entry, bookingId: event.target.value })
          }
          placeholder="booking id"
        />
      </label>
      <button type="submit">Send progress</button>
    </form>
  );
}
