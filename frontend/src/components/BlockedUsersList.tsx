import { ShieldOff, ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { useModeration } from "../hooks/useModeration";
import { AccountRole } from "../domain/account";
import { Button } from "./ui/Button";

type BlockedUsersListProps = {
  pubkey: string;
  viewerRole: AccountRole;
};

export function BlockedUsersList({ pubkey, viewerRole }: BlockedUsersListProps) {
  const { t } = useI18n();
  const { mutedPubkeys, removeMute, isMuted } = useModeration(pubkey, viewerRole);
  const blocked = Array.from(mutedPubkeys);

  if (blocked.length === 0) {
    return (
      <article className="panel">
        <h3>{t("moderation.blockedUsers")}</h3>
        <p className="muted">{t("moderation.blockedUsersEmpty")}</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <h3>{t("moderation.blockedUsers")}</h3>
      <ul className="blocked-users-list">
        {blocked.map((pk) => (
          <li key={pk} className="blocked-users-list-item">
            <ShieldOff size={16} className="blocked-users-list-icon" />
            <code className="blocked-users-list-pubkey">{pk.slice(0, 12)}...</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMute(pk)}
            >
              <ShieldCheck size={14} />
              {" "}{t("moderation.unblock")}
            </Button>
          </li>
        ))}
      </ul>
    </article>
  );
}
