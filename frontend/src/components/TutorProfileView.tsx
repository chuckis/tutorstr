import { TutorProfileEvent, TutorScheduleEvent } from "../types/nostr";

type TutorProfileViewProps = {
  entry: TutorProfileEvent;
  schedule?: TutorScheduleEvent;
  onBack: () => void;
};

export function TutorProfileView({ entry, schedule, onBack }: TutorProfileViewProps) {
  return (
    <div className="profile-view">
      <button type="button" className="ghost" onClick={onBack}>
        Back to directory
      </button>
      <h2>{entry.profile.name || "Unnamed Tutor"}</h2>
      <p>{entry.profile.bio || "No bio provided yet."}</p>
      <div className="chips">
        {entry.profile.subjects.map((subject) => (
          <span key={subject}>{subject}</span>
        ))}
      </div>
      <div className="meta">
        <span>
          Languages: {entry.profile.languages.join(", ") || "—"}
        </span>
        <span>
          Rate:{" "}
          {entry.profile.hourlyRate
            ? `$${entry.profile.hourlyRate}/hr`
            : "—"}
        </span>
      </div>
      <div className="schedule-view">
        <h3>Availability</h3>
        {schedule?.schedule.slots.length ? (
          <ul>
            {schedule.schedule.slots.map((slot, index) => (
              <li key={`${slot.start}-${index}`}>
                {slot.start} → {slot.end}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No schedule published yet.</p>
        )}
      </div>
    </div>
  );
}
