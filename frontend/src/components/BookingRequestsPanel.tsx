import { Booking } from "../domain/booking";
import { useI18n } from "../i18n/I18nProvider";
import { requestStatusLabel, toDisplayId } from "../utils/display";

type BookingRequestsPanelProps = {
  requests: Booking[];
  onRespond: (request: Booking, status: "accepted" | "rejected") => void;
};

export function BookingRequestsPanel({ requests, onRespond }: BookingRequestsPanelProps) {
  const { t, formatDateTime } = useI18n();
  const pendingRequests = requests.filter((request) => {
    return request.status !== "accepted" && request.status !== "rejected";
  });

  return (
    <div className="requests-panel">
      <h3>{t("requests.incoming")}</h3>
      {pendingRequests.length === 0 ? (
        <p className="muted">{t("requests.empty")}</p>
      ) : (
        <ul>
          {pendingRequests.map((request) => {
            return (
              <li key={request.id}>
                <div>
                  <strong>{t("discover.selectSlot")}:</strong> {formatDateTime(request.scheduledAt)}
                  {request.scheduledEnd ? ` -> ${formatDateTime(request.scheduledEnd)}` : ""}
                </div>
                <div>
                  <strong>{t("requests.student")}:</strong>{" "}
                  {toDisplayId(request.studentId, t("common.states.unknown"))}
                </div>
                <div className="request-actions">
                  <span className="muted">
                    {t("requests.status")}: {t(`common.status.${requestStatusLabel(request.status)}`)}
                  </span>
                  <div className="action-buttons">
                    <button
                      type="button"
                      onClick={() => onRespond(request, "accepted")}
                    >
                      {t("requests.accept")}
                    </button>
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() => onRespond(request, "rejected")}
                    >
                      {t("requests.decline")}
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
