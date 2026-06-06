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
  messagesByThread: Record<string, EncryptedMessage[]>;
  messageStatus: string;
};

export function StudentDetailView({
  profile,
  viewerRole,
  onBack,
  onSendMessage,
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

      {viewerRole === "tutor" ? (
        <article className="panel">
          <h3>{t("discover.messageStudent")}</h3>
          <MessageThread messages={chatMessages} />
          <MessageComposer
            onSend={(text) =>
              onSendMessage(profile.pubkey, text, threadInfo.threadKey)
            }
          />
          {messageStatus ? (
            <p className="muted">{messageStatus}</p>
          ) : null}
        </article>
      ) : null}
    </DetailPageLayout>
  );
}
