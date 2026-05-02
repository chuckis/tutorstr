import { Booking } from "../domain/booking";
import { useI18n } from "../i18n/I18nProvider";
import { EncryptedMessage, TutorProfileEvent } from "../types/nostr";
import { requestStatusLabel, toDisplayId } from "../utils/display";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

type RequestSegment = "incoming" | "outgoing";

type RequestsTabProps = {
  selectedRequest: {
    request: Booking;
    segment: RequestSegment;
  } | null;
  onSelectRequest: (
    next: {
      request: Booking;
      segment: RequestSegment;
    } | null
  ) => void;
  requestSegment: RequestSegment;
  onRequestSegmentChange: (segment: RequestSegment) => void;
  requestItems: Booking[];
  tutors: Record<string, TutorProfileEvent>;
  onRespondToBooking: (
    request: Booking,
    nextStatus: "accepted" | "rejected"
  ) => void | Promise<void>;
  onCancelRequest: (request: Booking) => void | Promise<void>;
  messagesByCounterparty: Record<string, EncryptedMessage[]>;
  getUnreadCount: (counterparty: string) => number;
  getUnreadTotal: (counterparties: string[]) => number;
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
};

function requestReasonLabel(request: Booking) {
  if (request.resolutionReason === "slot_filled") {
    return "slot_filled";
  }
  if (request.resolutionReason === "tutor_rejected") {
    return "tutor_rejected";
  }
  if (request.resolutionReason === "duplicate_bid") {
    return "duplicate_bid";
  }
  if (request.resolutionReason === "student_cancelled") {
    return "student_cancelled";
  }
  if (request.status === "accepted") {
    return "accepted";
  }
  return null;
}

export function RequestsTab({
  selectedRequest,
  onSelectRequest,
  requestSegment,
  onRequestSegmentChange,
  requestItems,
  tutors,
  onRespondToBooking,
  onCancelRequest,
  messagesByCounterparty,
  getUnreadCount,
  getUnreadTotal,
  onSendMessage,
  messageStatus
}: RequestsTabProps) {
  const { t, formatDateTime: formatLocalizedDateTime } = useI18n();
  const groupedIncomingRequests =
    requestSegment === "incoming"
      ? Object.values(
          requestItems.reduce<Record<string, Booking[]>>((acc, request) => {
            const existing = acc[request.slotAllocationKey] || [];
            existing.push(request);
            acc[request.slotAllocationKey] = existing;
            return acc;
          }, {})
        ).map((group) =>
          [...group].sort((left, right) => {
            const leftScore =
              left.status === "accepted" ? 0 : left.status === "pending" ? 1 : 2;
            const rightScore =
              right.status === "accepted" ? 0 : right.status === "pending" ? 1 : 2;

            if (leftScore !== rightScore) {
              return leftScore - rightScore;
            }

            return Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt);
          })
        )
      : [];

  if (selectedRequest) {
    const recipientPubkey =
      selectedRequest.segment === "incoming"
        ? selectedRequest.request.studentId
        : selectedRequest.request.tutorId;
    const isPending = selectedRequest.request.status === "pending";

    return (
      <section className="tab-panel requests-tab">
        <article className="panel details-screen">
          <button
            type="button"
            className="ghost"
            onClick={() => onSelectRequest(null)}
          >
            {t("requests.backToRequests")}
          </button>
          <h2>{t("requests.detailsTitle")}</h2>
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
            {selectedRequest.segment === "incoming"
              ? tutors[selectedRequest.request.studentId]?.profile.name ||
                toDisplayId(selectedRequest.request.studentId, t("common.states.unknown"))
              : tutors[selectedRequest.request.tutorId]?.profile.name ||
                toDisplayId(selectedRequest.request.tutorId, t("common.states.unknown"))}
          </p>
          <p>
            <strong>{t("requests.status")}:</strong>{" "}
            {t(`common.status.${requestStatusLabel(selectedRequest.request.status)}`)}
          </p>
          {requestReasonLabel(selectedRequest.request) ? (
            <p>
              <strong>{t("requests.resolution")}:</strong>{" "}
              {t(`common.requestResolution.${requestReasonLabel(selectedRequest.request)}`)}
            </p>
          ) : null}
          {selectedRequest.segment === "incoming" && isPending ? (
            <div className="action-buttons">
              <button
                type="button"
                onClick={() =>
                  Promise.resolve(
                    onRespondToBooking(selectedRequest.request, "accepted")
                  ).then(() => onSelectRequest(null))
                }
              >
                {t("requests.accept")}
              </button>
              <button
                type="button"
                className="ghost-action"
                onClick={() =>
                  Promise.resolve(
                    onRespondToBooking(selectedRequest.request, "rejected")
                  ).then(() => onSelectRequest(null))
                }
              >
                {t("requests.decline")}
              </button>
            </div>
          ) : null}
          {selectedRequest.segment === "outgoing" && isPending ? (
            <div className="action-buttons">
              <button
                type="button"
                className="ghost-action"
                onClick={() =>
                  Promise.resolve(onCancelRequest(selectedRequest.request)).then(() =>
                    onSelectRequest(null)
                  )
                }
              >
                {t("requests.cancelRequest")}
              </button>
            </div>
          ) : null}
          <div className="stack">
            <h3>{t("common.messages.title")}</h3>
            <MessageThread
              messages={messagesByCounterparty[recipientPubkey] || []}
            />
            <MessageComposer
              onSend={(text) => onSendMessage(recipientPubkey, text)}
            />
            {messageStatus ? <p className="muted">{messageStatus}</p> : null}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="tab-panel requests-tab">
      <div className="segmented">
        <button
          type="button"
          className={requestSegment === "incoming" ? "active" : ""}
          onClick={() => {
            onRequestSegmentChange("incoming");
            onSelectRequest(null);
          }}
        >
          {t("requests.incoming")}
        </button>
        <button
          type="button"
          className={requestSegment === "outgoing" ? "active" : ""}
          onClick={() => {
            onRequestSegmentChange("outgoing");
            onSelectRequest(null);
          }}
        >
          {t("requests.outgoing")}
        </button>
      </div>

      {requestItems.length === 0 ? (
        <p className="muted">{t("requests.empty")}</p>
      ) : requestSegment === "incoming" ? (
        <div className="stack">
          {groupedIncomingRequests.map((group) => {
            const slot = group[0];
            const winner = group.find((request) => request.status === "accepted") || null;
            const pendingCount = group.filter((request) => request.status === "pending").length;
            const unreadCount = getUnreadTotal(group.map((request) => request.studentId));

            return (
              <article
                className={`panel ${unreadCount > 0 ? "has-unread" : ""}`.trim()}
                key={slot.slotAllocationKey}
              >
                <h3>
                  {formatLocalizedDateTime(slot.scheduledAt)}
                  {slot.scheduledEnd ? ` -> ${formatLocalizedDateTime(slot.scheduledEnd)}` : ""}
                </h3>
                <p className="muted">
                  {t("requests.candidates", { count: group.length })}
                  {winner
                    ? ` • ${t("requests.allocated")}`
                    : pendingCount
                      ? ` • ${t("requests.pendingCount", { count: pendingCount })}`
                      : ""}
                </p>
                {unreadCount > 0 ? (
                  <p className="inline-indicator">
                    {unreadCount === 1
                      ? t("common.indicators.new")
                      : t("common.indicators.newCount", { count: unreadCount })}
                  </p>
                ) : null}
                <ul className="requests-list">
                  {group.map((request) => {
                    const statusRaw = request.status;
                    const statusText = requestStatusLabel(statusRaw);
                    const isPending = statusRaw === "pending";
                    const counterparty =
                      tutors[request.studentId]?.profile.name ||
                      toDisplayId(request.studentId, t("common.states.unknown"));
                    const reasonText = requestReasonLabel(request);
                    const requestUnreadCount = getUnreadCount(request.studentId);

                    return (
                      <li
                        key={request.id}
                        className={requestUnreadCount > 0 ? "has-unread" : ""}
                      >
                        <div>
                          <strong>{t("requests.student")}:</strong> {counterparty}
                        </div>
                        {reasonText ? (
                          <div>
                            <strong>{t("requests.resolution")}:</strong>{" "}
                            {t(`common.requestResolution.${reasonText}`)}
                          </div>
                        ) : null}
                        <div className="request-actions">
                          <span className={`status-pill status-${statusText}`}>
                            {t(`common.status.${statusText}`)}
                          </span>
                          {requestUnreadCount > 0 ? (
                            <span className="inline-indicator">
                              {requestUnreadCount === 1
                                ? t("common.indicators.new")
                                : t("common.indicators.newCount", {
                                    count: requestUnreadCount
                                  })}
                            </span>
                          ) : null}
                          {isPending ? (
                            <div className="action-buttons">
                              <button
                                type="button"
                                onClick={() => onRespondToBooking(request, "accepted")}
                              >
                                {t("requests.accept")}
                              </button>
                              <button
                                type="button"
                                className="ghost-action"
                                onClick={() => onRespondToBooking(request, "rejected")}
                              >
                                {t("requests.decline")}
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              onSelectRequest({
                                request,
                                segment: requestSegment
                              })
                            }
                          >
                            {t("common.buttons.details")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      ) : (
        <ul className="requests-list">
          {requestItems.map((request) => {
            const statusRaw = request.status;
            const statusText = requestStatusLabel(statusRaw);
            const isPending = statusRaw === "pending";
            const unreadCount =
              requestSegment === "incoming"
                ? getUnreadCount(request.studentId)
                : getUnreadCount(request.tutorId);
            const counterparty =
              requestSegment === "incoming"
                ? tutors[request.studentId]?.profile.name ||
                  toDisplayId(request.studentId, t("common.states.unknown"))
                : tutors[request.tutorId]?.profile.name ||
                  toDisplayId(request.tutorId, t("common.states.unknown"));

            return (
              <li key={request.id} className={unreadCount > 0 ? "has-unread" : ""}>
                <div>
                  <strong>{t("requests.subject")}:</strong> {t("requests.defaultSubject")}
                </div>
                <div>
                  <strong>{t("requests.scheduled")}:</strong>{" "}
                  {formatLocalizedDateTime(request.scheduledAt)}
                </div>
                <div>
                  <strong>{t("requests.counterparty")}:</strong> {counterparty}
                </div>
                <div className="request-actions">
                  <span className={`status-pill status-${statusText}`}>
                    {t(`common.status.${statusText}`)}
                  </span>
                  {unreadCount > 0 ? (
                    <span className="inline-indicator">
                      {unreadCount === 1
                        ? t("common.indicators.new")
                        : t("common.indicators.newCount", { count: unreadCount })}
                    </span>
                  ) : null}
                  {requestSegment === "incoming" && isPending ? (
                    <div className="action-buttons">
                      <button
                        type="button"
                        onClick={() => onRespondToBooking(request, "accepted")}
                      >
                        {t("requests.accept")}
                      </button>
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => onRespondToBooking(request, "rejected")}
                      >
                        {t("requests.decline")}
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRequest({
                        request,
                        segment: requestSegment
                      })
                    }
                  >
                    {t("common.buttons.details")}
                  </button>
                  {requestSegment === "outgoing" && isPending ? (
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() => onCancelRequest(request)}
                    >
                      {t("common.buttons.cancel")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
