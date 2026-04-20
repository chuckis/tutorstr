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
  ) => void;
  onCancelRequest: (request: Booking) => void;
  messagesByCounterparty: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
};

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
  if (selectedRequest) {
    const recipientPubkey =
      selectedRequest.segment === "incoming"
        ? selectedRequest.request.studentId
        : selectedRequest.request.tutorId;

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
          <h2>Accepted lesson request</h2>
          <p>
            <strong>Scheduled:</strong>{" "}
            {formatDateTime(selectedRequest.request.scheduledAt)}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {requestStatusLabel(selectedRequest.request.status)}
          </p>
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
                  {statusRaw === "accepted" ? (
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
                  ) : null}
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
