import { ProgressEntryEvent } from "../types/nostr";

type ProgressEntryListProps = {
  entries: ProgressEntryEvent[];
};

export function ProgressEntryList({ entries }: ProgressEntryListProps) {
  if (entries.length === 0) {
    return <p className="muted">No progress entries yet.</p>;
  }

  return (
    <ul className="progress-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div>
            <strong>{entry.entry.topic}</strong>
            {entry.entry.score !== undefined ? ` · Score: ${entry.entry.score}` : ""}
          </div>
          <div>{entry.entry.notes || "—"}</div>
          {entry.entry.bookingId ? (
            <div className="muted">Booking: {entry.entry.bookingId}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
