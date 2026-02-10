import { TutorProfileEvent } from "../types/nostr";

type TutorCardProps = {
  entry: TutorProfileEvent;
  onSelect: (entry: TutorProfileEvent) => void;
};

export function TutorCard({ entry, onSelect }: TutorCardProps) {
  return (
    <button
      type="button"
      className="tutor-card"
      onClick={() => onSelect(entry)}
    >
      <h3>{entry.profile.name || "Unnamed Tutor"}</h3>
      <p>{entry.profile.bio || "No bio provided."}</p>
      <div className="chips">
        {entry.profile.subjects.slice(0, 3).map((subject) => (
          <span key={subject}>{subject}</span>
        ))}
      </div>
    </button>
  );
}
