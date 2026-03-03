import { nip19 } from "nostr-tools";
import { TutorProfileEvent } from "../types/nostr";

type TutorCardProps = {
  entry: TutorProfileEvent;
  onSelect: (entry: TutorProfileEvent) => void;
};

export function TutorCard({ entry, onSelect }: TutorCardProps) {
  const displayName = entry.profile.name || toDisplayId(entry.pubkey);

  return (
    <button
      type="button"
      className="tutor-card"
      onClick={() => onSelect(entry)}
    >
      <h3>{displayName}</h3>
      <p>{entry.profile.bio || "No bio provided yet."}</p>
      <div className="chips">
        {entry.profile.subjects.length > 0 ? (
          entry.profile.subjects.slice(0, 3).map((subject) => (
            <span key={subject}>{subject}</span>
          ))
        ) : (
          <span>No subjects set</span>
        )}
      </div>
    </button>
  );
}

function toDisplayId(pubkey: string) {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 16)}...`;
  } catch {
    return `${pubkey.slice(0, 12)}...`;
  }
}
