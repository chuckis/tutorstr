import { useState } from "react";
import { TutorProfileEvent, TutorScheduleEvent } from "../types/nostr";
import { TutorCard } from "./TutorCard";
import { TutorProfileView } from "./TutorProfileView";

type DirectoryProps = {
  entries: TutorProfileEvent[];
  subjectFilter: string;
  onFilterChange: (value: string) => void;
  schedules: Record<string, TutorScheduleEvent>;
};

export function Directory({
  entries,
  subjectFilter,
  onFilterChange,
  schedules
}: DirectoryProps) {
  const [selectedTutor, setSelectedTutor] = useState<TutorProfileEvent | null>(
    null
  );

  if (selectedTutor) {
    return (
      <TutorProfileView
        entry={selectedTutor}
        schedule={schedules[selectedTutor.pubkey]}
        onBack={() => setSelectedTutor(null)}
      />
    );
  }

  return (
    <div className="directory">
      <label className="filter">
        Filter by subject
        <input
          value={subjectFilter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="calculus"
        />
      </label>

      <div className="card-grid">
        {entries.length === 0 ? (
          <p className="muted">No tutors found yet.</p>
        ) : (
          entries.map((entry) => (
            <TutorCard
              key={entry.pubkey}
              entry={entry}
              onSelect={setSelectedTutor}
            />
          ))
        )}
      </div>
    </div>
  );
}
