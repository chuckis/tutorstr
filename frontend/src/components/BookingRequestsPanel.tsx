import { Booking } from "../domain/booking";
import { formatDateTime, requestStatusLabel, toDisplayId } from "../utils/display";

type BookingRequestsPanelProps = {
  requests: Booking[];
  onRespond: (request: Booking, status: "accepted" | "rejected") => void;
};

export function BookingRequestsPanel({ requests, onRespond }: BookingRequestsPanelProps) {
  const pendingRequests = requests.filter((request) => {
    return request.status !== "accepted" && request.status !== "rejected";
  });

  return (
    <div className="requests-panel">
      <h3>Incoming booking requests</h3>
      {pendingRequests.length === 0 ? (
        <p className="muted">No requests yet.</p>
      ) : (
        <ul>
          {pendingRequests.map((request) => {
            return (
              <li key={request.id}>
                <div>
                  <strong>Slot:</strong> {formatDateTime(request.scheduledAt)}
                  {request.scheduledEnd ? ` -> ${formatDateTime(request.scheduledEnd)}` : ""}
                </div>
                <div>
                  <strong>Student:</strong> {toDisplayId(request.studentId)}
                </div>
                <div className="request-actions">
                  <span className="muted">Status: {requestStatusLabel(request.status)}</span>
                  <div className="action-buttons">
                    <button
                      type="button"
                      onClick={() => onRespond(request, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="ghost-action"
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
