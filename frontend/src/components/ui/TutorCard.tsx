import { nip19 } from "nostr-tools";
import { Card } from "./Card";
import { Avatar } from "../Avatar";
import { Tag } from "./Tag";
import { UserProfileEvent, AvailabilityMode } from "../../hooks/hookTypes";
import { useI18n } from "../../i18n/I18nProvider";

const MODE_LABEL_KEY: Record<AvailabilityMode, string> = {
  remote: "discover.remote",
  offline: "discover.offline",
  hybrid: "discover.hybrid"
};

function toDisplayId(pubkey: string) {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 12)}...`;
  } catch {
    return `${pubkey.slice(0, 8)}...`;
  }
}

type TutorCardProps = {
  entry: UserProfileEvent;
  onSelect: (entry: UserProfileEvent) => void;
};

export function TutorCard({ entry, onSelect }: TutorCardProps) {
  const { t } = useI18n();
  const displayName = entry.profile.name || toDisplayId(entry.pubkey);
  const mode = entry.profile.availabilityMode;
  const scheduleInfo = [entry.profile.workHours, entry.profile.timezone]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card hoverable padding="md" onClick={() => onSelect(entry)}>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
        <Avatar url={entry.profile.avatarUrl} role="tutor" size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-subheading)" }}>{displayName}</h3>
            {mode ? (
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--color-muted)" }}>
                {t(MODE_LABEL_KEY[mode])}
              </span>
            ) : null}
          </div>
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--fs-body)", color: "var(--color-text-muted)" }}>
            {entry.profile.bio || t("common.states.noBioYet")}
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {entry.profile.subjects.length > 0
              ? entry.profile.subjects.slice(0, 3).map((s) => <Tag key={s}>{s}</Tag>)
              : <span style={{ fontSize: "var(--fs-caption)", color: "var(--color-muted)" }}>{t("discover.noSubjects")}</span>}
          </div>
          {scheduleInfo ? (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--fs-caption)", color: "var(--color-muted)" }}>
              {scheduleInfo}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
