import { SelectedRequestViewModel } from "../hooks/useRequestsTabViewModel";
import { useI18n } from "../i18n/I18nProvider";
import { EncryptedMessage } from "../hooks/hookTypes";
import { useReviewsForSubject } from "../hooks/useReviewsForSubject";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { CounterpartyCard } from "./CounterpartyCard";
import { RequestActionBar } from "./RequestActionBar";
import { RequestStatusHistory } from "./RequestStatusHistory";
import { toDisplayId } from "../utils/display";

type RequestDetailsViewProps = {
  selectedRequest: SelectedRequestViewModel;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onBack: () => void;
  onRespondToRequest: (requestId: string, nextStatus: "accepted" | "rejected") => void | Promise<void>;
  onCancelRequest: (requestId: string) => void | Promise<void>;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  onViewProfile: () => void;
  messageStatus: string;
  currentPubkey?: string;
  onBlockUser?: (pubkey: string) => Promise<void>;
  onReportUser?: (targetPubkey: string, reason: string) => Promise<void>;
};

export function RequestDetailsView({
  selectedRequest,
  messagesByThread,
  onBack,
  onRespondToRequest,
  onCancelRequest,
  onSendMessage,
  onSendMessageWithFiles,
  onViewProfile,
  messageStatus,
  currentPubkey,
  onBlockUser,
  onReportUser,
}: RequestDetailsViewProps) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();
  const { reputation } = useReviewsForSubject(selectedRequest.recipientPubkey);

  const requestSubtitle = `${selectedRequest.counterpartyProfile?.profile.name || t("common.states.unknown")} · ${formatLocalizedDateTime(selectedRequest.request.scheduledAt)}`;
  const counterpartyName = selectedRequest.counterpartyProfile?.profile.name;

  return (
    <DetailPageLayout
      backLabel={t("requests.backToRequests")}
      onBack={onBack}
    >
      <CounterpartyCard
        profile={selectedRequest.counterpartyProfile}
        role={selectedRequest.viewerRole === "tutor" ? "student" : "tutor"}
        reputation={reputation}
        onViewProfile={onViewProfile}
        onBlockUser={onBlockUser}
        onReportUser={onReportUser}
      />

      <RequestStatusHistory statusHistory={selectedRequest.statusHistory} />

      <RequestActionBar
        canAccept={selectedRequest.canAccept}
        canDecline={selectedRequest.canDecline}
        canCancel={selectedRequest.canCancel}
        onAccept={() =>
          Promise.resolve(onRespondToRequest(selectedRequest.id, "accepted")).then(onBack)
        }
        onDecline={() =>
          Promise.resolve(onRespondToRequest(selectedRequest.id, "rejected")).then(onBack)
        }
        onCancel={() =>
          Promise.resolve(onCancelRequest(selectedRequest.id)).then(onBack)
        }
      />

      <div className="stack">
        <h3>{t("common.messages.title")}</h3>
        <MessageThread
          messages={messagesByThread[selectedRequest.threadKey] || []}
          currentPubkey={currentPubkey}
          resolveSenderName={(pubkey) =>
            pubkey === currentPubkey
              ? t("common.messages.you")
              : counterpartyName || toDisplayId(pubkey, t("common.states.unknown"))
          }
        />
        <MessageComposer
          onSend={(text) =>
            onSendMessage(
              selectedRequest.recipientPubkey,
              text,
              selectedRequest.threadKey
            )
          }
          onSendWithFiles={(text, files) =>
            onSendMessageWithFiles(
              selectedRequest.recipientPubkey,
              text,
              files,
              selectedRequest.threadKey
            )
          }
        />
        {messageStatus ? <p className="muted">{messageStatus}</p> : null}
      </div>
    </DetailPageLayout>
  );
}
