import { nip19 } from "nostr-tools";
import { Card } from "./Card";
import { Avatar } from "../Avatar";
import { Tag } from "./Tag";
import { UserProfileEvent } from "../../hooks/hookTypes";
import { useI18n } from "../../i18n/I18nProvider";

function toDisplayId(pubkey: string) {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 12)}...`;
  } catch {
    return `${pubkey.slice(0, 8)}...`;
  }
}

type StudentCardProps = {
  entry: UserProfileEvent;
  onSelect: (entry: UserProfileEvent) => void;
};

export function StudentCard({ entry, onSelect }: StudentCardProps) {
  const { t } = useI18n();
  const displayName = entry.profile.name || toDisplayId(entry.pubkey);
  const role = entry.profile.role ?? "student";

  return (
    <Card hoverable padding="md" onClick={() => onSelect(entry)}>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        <Avatar url={entry.profile.avatarUrl} role={role} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "var(--fs-subheading)" }}>{displayName}</h3>
          <p style={{ margin: "var(--space-1) 0", fontSize: "var(--fs-caption)", color: "var(--color-muted)" }}>
            {toDisplayId(entry.pubkey)}
          </p>
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-body)", color: "var(--color-text-muted)" }}>
            {entry.profile.bio || t("common.states.noBioYet")}
          </p>
          {entry.profile.languages.length > 0 ? (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {entry.profile.languages.map((lang) => <Tag key={lang}>{lang}</Tag>)}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
