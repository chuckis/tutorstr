import { BookingRequestEvent, BookingStatusEvent } from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";

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
  const { t } = useI18n();
  const filtered = requests.filter(
    (request) => request.tutorPubkey === tutorPubkey
  );

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="requests-panel">
      <h3>{t("profile.yourRequests")}</h3>
      <ul>
        {filtered.map((request) => {
          const status = statuses[request.request.bookingId]?.status.status;
          return (
            <li key={request.request.bookingId}>
              <div>
                <strong>{t("profile.slot")}:</strong> {request.request.requestedSlot.start} →{" "}
                {request.request.requestedSlot.end}
              </div>
              <div>
                <strong>{t("requests.status")}:</strong>{" "}
                {t(`common.status.${status || "pending"}`)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
