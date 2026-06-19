import { SelectedRequestViewModel } from "../hooks/useRequestsTabViewModel";
import { useI18n } from "../i18n/I18nProvider";
import { EncryptedMessage } from "../hooks/hookTypes";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { CounterpartyCard } from "./CounterpartyCard";
import { RequestActionBar } from "./RequestActionBar";
import { RequestStatusHistory } from "./RequestStatusHistory";

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
  onBlockUser,
  onReportUser,
}: RequestDetailsViewProps) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();

  const requestSubtitle = `${selectedRequest.counterpartyProfile?.profile.name || t("common.states.unknown")} · ${formatLocalizedDateTime(selectedRequest.request.scheduledAt)}`;

  return (
    <DetailPageLayout
      backLabel={t("requests.backToRequests")}
      onBack={onBack}
      title={t("requests.detailsTitle")}
      subtitle={requestSubtitle}
    >
      <CounterpartyCard
        profile={selectedRequest.counterpartyProfile}
        role={selectedRequest.viewerRole === "tutor" ? "student" : "tutor"}
        onViewProfile={onViewProfile}
        onBlockUser={onBlockUser ? (pk) => onBlockUser(pk) : undefined}
        onReportUser={onReportUser ? (pk, reason) => onReportUser(pk, reason) : undefined}
      />

      <article className="panel">
        <p>
          <strong>{t("requests.scheduled")}:</strong>{" "}
          {formatLocalizedDateTime(selectedRequest.request.scheduledAt)}
        </p>
        {selectedRequest.request.scheduledEnd ? (
          <p>
            <strong>{t("requests.ends")}:</strong>{" "}
            {formatLocalizedDateTime(selectedRequest.request.scheduledEnd)}
          </p>
        ) : null}
        <p>
          <strong>{t("requests.status")}:</strong>{" "}
          <span className={`status-pill status-${selectedRequest.statusLabel}`}>
            {t(`common.status.${selectedRequest.statusLabel}`)}
          </span>
        </p>
      </article>

      <RequestStatusHistory entries={selectedRequest.statusHistory} />

      <RequestActionBar
        canAccept={selectedRequest.canAccept}
        canDecline={selectedRequest.canDecline}
        canCancel={selectedRequest.canCancel}
        onAccept={() =>
          Promise.resolve(
            onRespondToRequest(selectedRequest.id, "accepted")
          ).then(onBack)
        }
        onDecline={() =>
          Promise.resolve(
            onRespondToRequest(selectedRequest.id, "rejected")
          ).then(onBack)
        }
        onCancel={() =>
          Promise.resolve(onCancelRequest(selectedRequest.id)).then(onBack)
        }
      />

      <div className="stack">
        <h3>{t("common.messages.title")}</h3>
        <MessageThread messages={messagesByThread[selectedRequest.threadKey] || []} />
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
