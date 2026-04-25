import { Booking } from "../domain/booking";
import { EncryptedMessage, TutorProfileEvent } from "../types/nostr";
import { formatDateTime, requestStatusLabel, toDisplayId } from "../utils/display";
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
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
};

function requestReasonLabel(request: Booking) {
  if (request.resolutionReason === "slot_filled") {
    return "Filled by another student";
  }
  if (request.resolutionReason === "tutor_rejected") {
    return "Declined by tutor";
  }
  if (request.resolutionReason === "duplicate_bid") {
    return "Duplicate request";
  }
  if (request.resolutionReason === "student_cancelled") {
    return "Cancelled by student";
  }
  if (request.status === "accepted") {
    return "Won slot";
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
  onSendMessage,
  messageStatus
}: RequestsTabProps) {
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
            Back to requests
          </button>
          <h2>Lesson request details</h2>
          <p>
            <strong>Scheduled:</strong>{" "}
            {formatDateTime(selectedRequest.request.scheduledAt)}
          </p>
          {selectedRequest.request.scheduledEnd ? (
            <p>
              <strong>Ends:</strong>{" "}
              {formatDateTime(selectedRequest.request.scheduledEnd)}
            </p>
          ) : null}
          <p>
            <strong>Counterparty:</strong>{" "}
            {selectedRequest.segment === "incoming"
              ? tutors[selectedRequest.request.studentId]?.profile.name ||
                toDisplayId(selectedRequest.request.studentId)
              : tutors[selectedRequest.request.tutorId]?.profile.name ||
                toDisplayId(selectedRequest.request.tutorId)}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {requestStatusLabel(selectedRequest.request.status)}
          </p>
          {requestReasonLabel(selectedRequest.request) ? (
            <p>
              <strong>Resolution:</strong>{" "}
              {requestReasonLabel(selectedRequest.request)}
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
                Accept
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
                Decline
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
                Cancel request
              </button>
            </div>
          ) : null}
          <div className="stack">
            <h3>Encrypted messages</h3>
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
          Incoming
        </button>
        <button
          type="button"
          className={requestSegment === "outgoing" ? "active" : ""}
          onClick={() => {
            onRequestSegmentChange("outgoing");
            onSelectRequest(null);
          }}
        >
          Outgoing
        </button>
      </div>

      {requestItems.length === 0 ? (
        <p className="muted">No requests in this segment.</p>
      ) : requestSegment === "incoming" ? (
        <div className="stack">
          {groupedIncomingRequests.map((group) => {
            const slot = group[0];
            const winner = group.find((request) => request.status === "accepted") || null;
            const pendingCount = group.filter((request) => request.status === "pending").length;

            return (
              <article className="panel" key={slot.slotAllocationKey}>
                <h3>
                  {formatDateTime(slot.scheduledAt)}
                  {slot.scheduledEnd ? ` -> ${formatDateTime(slot.scheduledEnd)}` : ""}
                </h3>
                <p className="muted">
                  Candidates: {group.length}
                  {winner ? " • Allocated" : pendingCount ? ` • Pending: ${pendingCount}` : ""}
                </p>
                <ul className="requests-list">
                  {group.map((request) => {
                    const statusRaw = request.status;
                    const statusText = requestStatusLabel(statusRaw);
                    const isPending = statusRaw === "pending";
                    const counterparty =
                      tutors[request.studentId]?.profile.name ||
                      toDisplayId(request.studentId);
                    const reasonText = requestReasonLabel(request);

                    return (
                      <li key={request.id}>
                        <div>
                          <strong>Student:</strong> {counterparty}
                        </div>
                        {reasonText ? (
                          <div>
                            <strong>Resolution:</strong> {reasonText}
                          </div>
                        ) : null}
                        <div className="request-actions">
                          <span className={`status-pill status-${statusText}`}>
                            {statusText}
                          </span>
                          {isPending ? (
                            <div className="action-buttons">
                              <button
                                type="button"
                                onClick={() => onRespondToBooking(request, "accepted")}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="ghost-action"
                                onClick={() => onRespondToBooking(request, "rejected")}
                              >
                                Decline
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
                            Details
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
            const counterparty =
              requestSegment === "incoming"
                ? tutors[request.studentId]?.profile.name || toDisplayId(request.studentId)
                : tutors[request.tutorId]?.profile.name || toDisplayId(request.tutorId);

            return (
              <li key={request.id}>
                <div>
                  <strong>Subject:</strong> Tutoring lesson
                </div>
                <div>
                  <strong>Scheduled:</strong>{" "}
                  {formatDateTime(request.scheduledAt)}
                </div>
                <div>
                  <strong>Counterparty:</strong> {counterparty}
                </div>
                <div className="request-actions">
                  <span className={`status-pill status-${statusText}`}>
                    {statusText}
                  </span>
                  {requestSegment === "incoming" && isPending ? (
                    <div className="action-buttons">
                      <button
                        type="button"
                        onClick={() => onRespondToBooking(request, "accepted")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => onRespondToBooking(request, "rejected")}
                      >
                        Decline
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
                    Details
                  </button>
                  {requestSegment === "outgoing" && isPending ? (
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() => onCancelRequest(request)}
                    >
                      Cancel
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
