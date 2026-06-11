import { UserProfileEvent } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type CounterpartyCardProps = {
  profile?: UserProfileEvent;
  role: "tutor" | "student";
  onViewProfile?: () => void;
};

export function CounterpartyCard({
  profile,
  role,
  onViewProfile
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
        <Button variant="ghost" onClick={onViewProfile}>
          {t("requests.viewProfile")}
        </Button>
      ) : null}
    </Card>
  );
}
