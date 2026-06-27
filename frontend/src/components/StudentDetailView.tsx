import { AccountRole, EncryptedMessage, UserProfileEvent } from "../hooks/hookTypes";
import { fallbackDirectMessageThreadKey } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { useReviewsForSubject } from "../hooks/useReviewsForSubject";
import { Avatar } from "./Avatar";
import { DetailPageLayout } from "./DetailPageLayout";
import { KebabMenu } from "./ui/KebabMenu";
import { ReputationBadge } from "./ReputationBadge";

type StudentDetailViewProps = {
  profile: UserProfileEvent;
  viewerRole: AccountRole;
  onBack: () => void;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  messagesByThread: Record<string, EncryptedMessage[]>;
  messageStatus: string;
  onBlockUser?: (pubkey: string) => Promise<void>;
  onReportUser?: (targetPubkey: string, reason: string) => Promise<void>;
};

export function StudentDetailView({
  profile,
  viewerRole,
  onBack,
  onSendMessage,
  onSendMessageWithFiles,
  messagesByThread,
  messageStatus,
  onBlockUser,
  onReportUser,
}: StudentDetailViewProps) {
  const { t } = useI18n();
  const { reputation } = useReviewsForSubject(profile.pubkey);
  const role = profile.profile.role ?? "student";

  const kebabItems = [
    ...(onBlockUser
      ? [{ label: t("moderation.block"), onClick: () => onBlockUser(profile.pubkey), danger: true as const }]
      : []),
    ...(onReportUser
      ? [{ label: t("moderation.reportUser"), onClick: () => onReportUser(profile.pubkey, "Spam"), danger: true as const }]
      : []),
  ];

  return (
    <DetailPageLayout
      backLabel={t("discover.backToDiscover")}
      onBack={onBack}
    >
      <article className="panel">
        <div className="tutor-profile-header">
          <Avatar url={profile.profile.avatarUrl} role={role} size="lg" />
          <div className="tutor-info">
            <h2>
              {profile.profile.name || t("common.states.unnamedStudent")}
            </h2>
            <p className="muted">
              {profile.profile.languages.join(", ") || t("common.states.notSet")}
            </p>
          </div>
          {kebabItems.length > 0 ? (
            <div className="kebab-wrapper">
              <KebabMenu items={kebabItems} />
            </div>
          ) : null}
        </div>
        {reputation ? (
          <ReputationBadge reputation={reputation} />
        ) : null}
        <p>{profile.profile.bio || t("common.states.noBioYet")}</p>
      </article>
    </DetailPageLayout>
  );
}
