import { ProgressEntryEvent } from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";

type ProgressEntryListProps = {
  entries: ProgressEntryEvent[];
};

export function ProgressEntryList({ entries }: ProgressEntryListProps) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return <p className="muted">{t("progress.empty")}</p>;
  }

  return (
    <ul className="progress-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div>
            <strong>{entry.entry.topic}</strong>
            {entry.entry.score !== undefined
              ? ` · ${t("progress.scoreLabel", { value: entry.entry.score })}`
              : ""}
          </div>
          <div>{entry.entry.notes || "—"}</div>
          {entry.entry.bookingId ? (
            <div className="muted">
              {t("progress.bookingLabel", { value: entry.entry.bookingId })}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
