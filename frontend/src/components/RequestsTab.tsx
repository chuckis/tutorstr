import { Inbox, Send } from "lucide-react";
import {
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestSegment,
  RequestsTabViewModel,
  SelectedRequest,
} from "../hooks/useRequestsTabViewModel";
import { useI18n } from "../i18n/I18nProvider";
import { EncryptedMessage } from "../hooks/hookTypes";
import { HintIcon } from "./ui/HintIcon";
import { RequestCard } from "./RequestCard";
import { RequestDetailsView } from "./RequestDetailsView";
import { Spinner } from "./Spinner";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";

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
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  onViewProfile: () => void;
  messageStatus: string;
  role: "tutor" | "student";
  loading: boolean;
  mutedPubkeys: Set<string>;
  onBlockUser: (pubkey: string) => Promise<void>;
  onReportUser: (targetPubkey: string, reason: string, options?: { eventId?: string; label?: string }) => Promise<void>;
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
                <Button variant="ghost" onClick={() => onRespondToRequest(item.id, "rejected")}>
                  {t("requests.decline")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {item.canCancel ? (
            <Button variant="ghost" onClick={() => onCancelRequest(item.id)}>
              {variant === "outgoing"
                ? t("common.buttons.cancel")
                : t("requests.cancelRequest")}
            </Button>
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
  onSendMessageWithFiles,
  onViewProfile,
  messageStatus,
  role,
  loading,
  mutedPubkeys,
  onBlockUser,
  onReportUser,
}: RequestsTabProps) {
  const { t } = useI18n();
  const isStudent = role === "student";

  if (viewModel.selectedRequest) {
    return (
      <RequestDetailsView
        selectedRequest={viewModel.selectedRequest}
        messagesByThread={messagesByThread}
        onBack={() => window.history.back()}
        onRespondToRequest={onRespondToRequest}
        onCancelRequest={onCancelRequest}
        onSendMessage={onSendMessage}
        onSendMessageWithFiles={onSendMessageWithFiles}
        onViewProfile={onViewProfile}
        onBlockUser={onBlockUser}
        onReportUser={onReportUser}
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
          <Button variant="ghost"
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
          </Button>
          <Button variant="ghost"
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
          </Button>
        </div>
      )}

      {viewModel.isEmpty && loading ? (
        <Spinner label={t("common.states.loading")} />
      ) : viewModel.isEmpty ? (
        <EmptyState
          description={isStudent
            ? t("requests.student.empty")
            : t("requests.empty")}
        />
      ) : requestSegment === "incoming" && !isStudent ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h3 style={{ fontSize: "var(--fs-body)", margin: 0 }}>
              {t("requests.incoming")}
            </h3>
            <HintIcon
              hintId="booking-request"
              title={t("hints.booking-request.title")}
              content={t("hints.booking-request.content")}
            />
          </div>
          <IncomingRequestGroups
            groups={viewModel.incomingGroups}
            onSelectRequest={onSelectRequest}
            onRespondToRequest={onRespondToRequest}
            onCancelRequest={onCancelRequest}
          />
        </>
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
