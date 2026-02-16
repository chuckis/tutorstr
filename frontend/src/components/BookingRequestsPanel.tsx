import { BookingRequestEvent, BookingStatusEvent } from "../types/nostr";

type BookingRequestsPanelProps = {
  requests: BookingRequestEvent[];
  statuses: Record<string, BookingStatusEvent>;
  onRespond: (
    request: BookingRequestEvent,
    status: "accepted" | "rejected"
  ) => void;
};

export function BookingRequestsPanel({
  requests,
  statuses,
  onRespond
}: BookingRequestsPanelProps) {
  return (
    <div className="requests-panel">
      <h3>Incoming booking requests</h3>
      {requests.length === 0 ? (
        <p className="muted">No requests yet.</p>
      ) : (
        <ul>
          {requests.map((request) => {
            const status = statuses[request.request.bookingId]?.status.status;
            return (
              <li key={request.request.bookingId}>
                <div>
                  <strong>Slot:</strong> {request.request.requestedSlot.start} →{" "}
                  {request.request.requestedSlot.end}
                </div>
                <div>
                  <strong>Message:</strong> {request.request.message || "—"}
                </div>
                <div>
                  <strong>Student:</strong> {request.request.studentNpub}
                </div>
                <div className="request-actions">
                  <span className="muted">Status: {status || "pending"}</span>
                  <div className="action-buttons">
                    <button
                      type="button"
                      onClick={() => onRespond(request, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => onRespond(request, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
