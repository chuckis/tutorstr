import { AccountRole, EncryptedMessage, UserProfileEvent } from "../hooks/hookTypes";
import { fallbackDirectMessageThreadKey } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { Avatar } from "./Avatar";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

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
};

export function StudentDetailView({
  profile,
  viewerRole,
  onBack,
  onSendMessage,
  onSendMessageWithFiles,
  messagesByThread,
  messageStatus
}: StudentDetailViewProps) {
  const { t } = useI18n();
  const role = profile.profile.role ?? "student";
  const threadInfo = fallbackDirectMessageThreadKey(profile.pubkey);
  const chatMessages = messagesByThread[threadInfo.threadKey] || [];

  return (
    <DetailPageLayout
      backLabel={t("discover.backToDiscover")}
      onBack={onBack}
    >
      <article className="panel">
        <div className="tutor-profile-header">
          <Avatar url={profile.profile.avatarUrl} role={role} size="lg" />
          <div>
            <h2>
              {profile.profile.name || t("common.states.unnamedStudent")}
            </h2>
            <p className="muted">
              {profile.profile.languages.join(", ") || t("common.states.notSet")}
            </p>
          </div>
        </div>
        <p>{profile.profile.bio || t("common.states.noBioYet")}</p>
      </article>
    </DetailPageLayout>
  );
}
