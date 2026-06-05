import { UserProfileEvent } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Avatar } from "./Avatar";

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
      <div className="counterparty-card">
        <div className="counterparty-card-header">
          <Avatar role={role} size="md" />
          <div>
            <strong>{t("common.states.unknown")}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="counterparty-card">
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
      {profile.profile.subjects && profile.profile.subjects.length > 0 ? (
        <div className="chips">
          {profile.profile.subjects.map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      ) : null}
      {onViewProfile ? (
        <button
          type="button"
          className="ghost-action"
          onClick={onViewProfile}
        >
          {t("requests.viewProfile")}
        </button>
      ) : null}
    </div>
  );
}
