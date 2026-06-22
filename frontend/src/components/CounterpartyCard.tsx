import { UserProfileEvent } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { KebabMenu } from "./ui/KebabMenu";

type CounterpartyCardProps = {
  profile?: UserProfileEvent;
  role: "tutor" | "student";
  onViewProfile?: () => void;
  onBlockUser?: (pubkey: string) => Promise<void>;
  onReportUser?: (targetPubkey: string, reason: string) => Promise<void>;
};

export function CounterpartyCard({
  profile,
  role,
  onViewProfile,
  onBlockUser,
  onReportUser,
}: CounterpartyCardProps) {
  const { t } = useI18n();

  if (!profile) {
    return (
      <Card padding="sm" variant="elevated">
        <div className="counterparty-card-header">
          <Avatar role={role} size="md" />
          <div>
            <strong>{t("common.states.unknown")}</strong>
          </div>
        </div>
      </Card>
    );
  }

  const kebabItems = [
    ...(onViewProfile
      ? [{ label: t("requests.viewProfile"), onClick: onViewProfile }]
      : []),
    ...(onBlockUser
      ? [{ label: t("moderation.block"), onClick: () => onBlockUser(profile.pubkey), danger: true as const }]
      : []),
    ...(onReportUser
      ? [{ label: t("moderation.reportUser"), onClick: () => onReportUser(profile.pubkey, "Spam"), danger: true as const }]
      : []),
  ];

  return (
    <Card padding="sm" variant="elevated">
      <div className="counterparty-card-header">
        <Avatar
          url={profile.profile.avatarUrl}
          role={role}
          size="md"
        />
        <div>
          <strong>
            {profile.profile.name || t("common.states.unknown")}
          </strong>
        </div>
        {kebabItems.length > 0 ? (
          <div className="kebab-wrapper">
            <KebabMenu items={kebabItems} />
          </div>
        ) : null}
      </div>
      {profile.profile.bio ? (
        <p className="muted">{profile.profile.bio}</p>
      ) : null}
      {role === "tutor" && profile.profile.subjects && profile.profile.subjects.length > 0 ? (
        <div className="chips">
          {profile.profile.subjects.map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      ) : null}
      {onViewProfile ? (
        <div className="request-actions" style={{ marginTop: "0.5rem" }}>
          <Button variant="ghost" size="sm" onClick={onViewProfile}>
            {t("requests.viewProfile")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
