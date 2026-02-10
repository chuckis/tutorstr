import { BookingRequestEvent, BookingStatusEvent } from "../types/nostr";

type MyBookingRequestsProps = {
  requests: BookingRequestEvent[];
  statuses: Record<string, BookingStatusEvent>;
  tutorPubkey: string;
};

export function MyBookingRequests({
  requests,
  statuses,
  tutorPubkey
}: MyBookingRequestsProps) {
  const filtered = requests.filter(
    (request) => request.tutorPubkey === tutorPubkey
  );

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="requests-panel">
      <h3>Your requests</h3>
      <ul>
        {filtered.map((request) => {
          const status = statuses[request.request.bookingId]?.status.status;
          return (
            <li key={request.request.bookingId}>
              <div>
                <strong>Slot:</strong> {request.request.requestedSlot.start} →{" "}
                {request.request.requestedSlot.end}
              </div>
              <div>
                <strong>Status:</strong> {status || "pending"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
