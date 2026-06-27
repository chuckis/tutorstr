import { StatusHistoryEntry } from "../application/usecases/buildRequestsTabViewModel";
import { useI18n } from "../i18n/I18nProvider";

type RequestStatusHistoryProps = {
  entries: StatusHistoryEntry[];
};

export function RequestStatusHistory({
  entries
}: RequestStatusHistoryProps) {
  const { t, formatDateTime } = useI18n();

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div className="status-history">
      <h3>{t("requests.statusHistory")}</h3>
      <ul className="status-history-list">
        {entries.map((entry, index) => {
          let ms: number;
          try {
            ms = Number.isFinite(entry.timestamp) && entry.timestamp > 0
              ? entry.timestamp * 1000
              : Date.now();
          } catch {
            ms = Date.now();
          }

          const label = new Date(ms).toISOString();

          return (
            <li key={index} className="status-history-item">
              <div className="status-history-dot" />
              <div className="status-history-content">
                <span className={`status-pill status-${entry.status}`}>
                  {t(`common.status.${entry.status}`)}
                </span>
                <span className="muted">
                  {formatDateTime(label)}
                </span>
                {entry.reason ? (
                  <span className="muted">
                    {t(`common.requestResolution.${entry.reason}`)}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
