import { Inbox, Send } from "lucide-react";
import {
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestSegment,
  RequestsTabViewModel,
  SelectedRequest,
  SelectedRequestViewModel
} from "../hooks/useRequestsTabViewModel";
import { useI18n } from "../i18n/I18nProvider";
import { EncryptedMessage } from "../hooks/hookTypes";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { RequestCard } from "./RequestCard";
import { Spinner } from "./Spinner";

type RequestsTabProps = {
  viewModel: RequestsTabViewModel;
  onSelectRequest: (next: SelectedRequest | null) => void;
  requestSegment: RequestSegment;
  onRequestSegmentChange: (segment: RequestSegment) => void;
  onRespondToRequest: (
    requestId: string,
    nextStatus: "accepted" | "rejected"
  ) => void | Promise<void>;
  onCancelRequest: (requestId: string) => void | Promise<void>;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  messageStatus: string;
  role: "tutor" | "student";
  loading: boolean;
};

type RequestItemActions = {
  onSelectRequest: (next: SelectedRequest) => void;
  onRespondToRequest: (
    requestId: string,
    nextStatus: "accepted" | "rejected"
  ) => void | Promise<void>;
  onCancelRequest: (requestId: string) => void | Promise<void>;
};

function UnreadIndicator({ count }: { count: number }) {
  const { t } = useI18n();

  if (count <= 0) {
    return null;
  }

  return (
    <span className="inline-indicator">
      {count === 1
        ? t("common.indicators.new")
        : t("common.indicators.newCount", { count })}
    </span>
  );
}

function StatusPill({ label }: { label: string }) {
  const { t } = useI18n();

  return (
    <span className={`status-pill status-${label}`}>
      {t(`common.status.${label}`)}
    </span>
  );
}

function RequestItemCard({
  item,
  variant,
  onSelectRequest,
  onRespondToRequest,
  onCancelRequest
}: RequestItemActions & {
  item: RequestListItemViewModel;
  variant: "incoming" | "outgoing";
}) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();

  return (
    <RequestCard
      key={item.id}
      className={item.unreadCount > 0 ? "has-unread" : ""}
      onOpen={() =>
        onSelectRequest({
          request: item.request,
          segment: item.segment
        })
      }
      footer={
        <>
          <StatusPill label={item.statusLabel} />
          <UnreadIndicator count={item.unreadCount} />
          {item.canAccept || item.canDecline ? (
            <div className="action-buttons">
              {item.canAccept ? (
                <button
                  type="button"
                  onClick={() => onRespondToRequest(item.id, "accepted")}
                >
                  {t("requests.accept")}
                </button>
              ) : null}
              {item.canDecline ? (
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => onRespondToRequest(item.id, "rejected")}
                >
                  {t("requests.decline")}
                </button>
              ) : null}
            </div>
          ) : null}
          {item.canCancel ? (
            <button
              type="button"
              className="ghost-action"
              onClick={() => onCancelRequest(item.id)}
            >
              {variant === "outgoing"
                ? t("common.buttons.cancel")
                : t("requests.cancelRequest")}
            </button>
          ) : null}
        </>
      }
    >
      {variant === "incoming" ? (
        <>
          <div>
            <strong>{t("requests.partyRole.student")}:</strong> {item.counterpartyLabel}
          </div>
          {item.reasonLabel ? (
            <div>
              <strong>{t("requests.resolution")}:</strong>{" "}
              {t(`common.requestResolution.${item.reasonLabel}`)}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <strong>{t("requests.subject")}:</strong> {t("requests.defaultSubject")}
          </div>
          <div>
            <strong>{t("requests.scheduled")}:</strong>{" "}
            {formatLocalizedDateTime(item.request.scheduledAt)}
          </div>
          <div>
            <strong>{t("requests.counterparty")}:</strong> {item.counterpartyLabel}
          </div>
        </>
      )}
    </RequestCard>
  );
}

function RequestDetailsView({
  selectedRequest,
  messagesByThread,
  onBack,
  onRespondToRequest,
  onCancelRequest,
  onSendMessage,
  messageStatus
}: {
  selectedRequest: SelectedRequestViewModel;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onBack: () => void;
  onRespondToRequest: RequestsTabProps["onRespondToRequest"];
  onCancelRequest: RequestsTabProps["onCancelRequest"];
  onSendMessage: RequestsTabProps["onSendMessage"];
  messageStatus: string;
}) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();

  return (
    <DetailPageLayout
      backLabel={t("requests.backToRequests")}
      onBack={onBack}
      title={t("requests.detailsTitle")}
    >
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
          <strong>{t("requests.counterparty")}:</strong>{" "}
          {selectedRequest.counterpartyLabel}
        </p>
        <p>
          <strong>{t("requests.status")}:</strong>{" "}
          {t(`common.status.${selectedRequest.statusLabel}`)}
        </p>
        {selectedRequest.reasonLabel ? (
          <p>
            <strong>{t("requests.resolution")}:</strong>{" "}
            {t(`common.requestResolution.${selectedRequest.reasonLabel}`)}
          </p>
        ) : null}
        {selectedRequest.canAccept || selectedRequest.canDecline ? (
          <div className="action-buttons">
            {selectedRequest.canAccept ? (
              <button
                type="button"
                onClick={() =>
                  Promise.resolve(
                    onRespondToRequest(selectedRequest.id, "accepted")
                  ).then(onBack)
                }
              >
                {t("requests.accept")}
              </button>
            ) : null}
            {selectedRequest.canDecline ? (
              <button
                type="button"
                className="ghost-action"
                onClick={() =>
                  Promise.resolve(
                    onRespondToRequest(selectedRequest.id, "rejected")
                  ).then(onBack)
                }
              >
                {t("requests.decline")}
              </button>
            ) : null}
          </div>
        ) : null}
        {selectedRequest.canCancel ? (
          <div className="action-buttons">
            <button
              type="button"
              className="ghost-action"
              onClick={() =>
                Promise.resolve(onCancelRequest(selectedRequest.id)).then(onBack)
              }
            >
              {t("requests.cancelRequest")}
            </button>
          </div>
        ) : null}
      </article>
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
        />
        {messageStatus ? <p className="muted">{messageStatus}</p> : null}
      </div>
    </DetailPageLayout>
  );
}

function IncomingRequestGroups({
  groups,
  onSelectRequest,
  onRespondToRequest,
  onCancelRequest
}: RequestItemActions & {
  groups: IncomingRequestGroupViewModel[];
}) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();

  return (
    <div className="stack">
      {groups.map((group) => (
        <article
          className={`panel ${group.unreadCount > 0 ? "has-unread" : ""}`.trim()}
          key={group.slotAllocationKey}
        >
          <h3>
            {formatLocalizedDateTime(group.scheduledAt)}
            {group.scheduledEnd ? ` -> ${formatLocalizedDateTime(group.scheduledEnd)}` : ""}
          </h3>
          <p className="muted">
            {t("requests.candidates", { count: group.candidateCount })}
            {group.isAllocated
              ? ` • ${t("requests.allocated")}`
              : group.pendingCount
                ? ` • ${t("requests.pendingCount", { count: group.pendingCount })}`
                : ""}
          </p>
          {group.unreadCount > 0 ? (
            <p className="inline-indicator">
              {group.unreadCount === 1
                ? t("common.indicators.new")
                : t("common.indicators.newCount", { count: group.unreadCount })}
            </p>
          ) : null}
          <ul className="requests-list">
            {group.requests.map((item) => (
              <RequestItemCard
                key={item.id}
                item={item}
                variant="incoming"
                onSelectRequest={onSelectRequest}
                onRespondToRequest={onRespondToRequest}
                onCancelRequest={onCancelRequest}
              />
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function OutgoingRequestList({
  requests,
  onSelectRequest,
  onRespondToRequest,
  onCancelRequest
}: RequestItemActions & {
  requests: RequestListItemViewModel[];
}) {
  return (
    <ul className="requests-list">
      {requests.map((item) => (
        <RequestItemCard
          key={item.id}
          item={item}
          variant="outgoing"
          onSelectRequest={onSelectRequest}
          onRespondToRequest={onRespondToRequest}
          onCancelRequest={onCancelRequest}
        />
      ))}
    </ul>
  );
}

export function RequestsTab({
  viewModel,
  onSelectRequest,
  requestSegment,
  onRequestSegmentChange,
  onRespondToRequest,
  onCancelRequest,
  messagesByThread,
  onSendMessage,
  messageStatus,
  role,
  loading
}: RequestsTabProps) {
  const { t } = useI18n();
  const isStudent = role === "student";

  if (viewModel.selectedRequest) {
    return (
      <RequestDetailsView
        selectedRequest={viewModel.selectedRequest}
        messagesByThread={messagesByThread}
        onBack={() => onSelectRequest(null)}
        onRespondToRequest={onRespondToRequest}
        onCancelRequest={onCancelRequest}
        onSendMessage={onSendMessage}
        messageStatus={messageStatus}
      />
    );
  }

  return (
    <section className="tab-panel requests-tab">
      {isStudent ? (
        <h2 className="sr-only">{t("requests.outgoing")}</h2>
      ) : (
        <div className="segmented">
          <button
            type="button"
            aria-label={t("requests.incoming")}
            className={requestSegment === "incoming" ? "active" : ""}
            onClick={() => {
              onRequestSegmentChange("incoming");
              onSelectRequest(null);
            }}
          >
            <Inbox size={18} aria-hidden="true" />
            <span className="sr-only">{t("requests.incoming")}</span>
          </button>
          <button
            type="button"
            aria-label={t("requests.outgoing")}
            className={requestSegment === "outgoing" ? "active" : ""}
            onClick={() => {
              onRequestSegmentChange("outgoing");
              onSelectRequest(null);
            }}
          >
            <Send size={18} aria-hidden="true" />
            <span className="sr-only">{t("requests.outgoing")}</span>
          </button>
        </div>
      )}

      {viewModel.isEmpty && loading ? (
        <Spinner label={t("common.states.loading")} />
      ) : viewModel.isEmpty ? (
        <p className="muted">
          {isStudent
            ? t("requests.student.empty")
            : t("requests.empty")}
        </p>
      ) : requestSegment === "incoming" && !isStudent ? (
        <IncomingRequestGroups
          groups={viewModel.incomingGroups}
          onSelectRequest={onSelectRequest}
          onRespondToRequest={onRespondToRequest}
          onCancelRequest={onCancelRequest}
        />
      ) : (
        <OutgoingRequestList
          requests={viewModel.outgoingRequests}
          onSelectRequest={onSelectRequest}
          onRespondToRequest={onRespondToRequest}
          onCancelRequest={onCancelRequest}
        />
      )}
    </section>
  );
}
