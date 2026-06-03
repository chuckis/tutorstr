import { nip19 } from "nostr-tools";
import { useI18n } from "../i18n/I18nProvider";
import { TutorProfileEvent } from "../hooks/hookTypes";
import { Avatar } from "./Avatar";

type TutorCardProps = {
  entry: TutorProfileEvent;
  onSelect: (entry: TutorProfileEvent) => void;
};

export function TutorCard({ entry, onSelect }: TutorCardProps) {
  const { t } = useI18n();
  const displayName = entry.profile.name || toDisplayId(entry.pubkey);
  const idLabel = toDisplayId(entry.pubkey);

  return (
    <button
      type="button"
      className="tutor-card"
      onClick={() => onSelect(entry)}
    >
      <div className="tutor-card-header">
        <Avatar url={entry.profile.avatarUrl} role="tutor" size="md" />
        <div className="tutor-card-header-info">
          <h3>{displayName}</h3>
          <span className="tutor-card-id">{idLabel}</span>
        </div>
      </div>
      <p className="tutor-card-bio">
        {entry.profile.bio || t("common.states.noBioYet")}
      </p>
      <div className="chips">
        {entry.profile.subjects.length > 0 ? (
          entry.profile.subjects.slice(0, 3).map((subject) => (
            <span key={subject}>{subject}</span>
          ))
        ) : (
          <span>{t("discover.noSubjects")}</span>
        )}
      </div>
    </button>
  );
}

function toDisplayId(pubkey: string) {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 12)}...`;
  } catch {
    return `${pubkey.slice(0, 8)}...`;
  }
}
