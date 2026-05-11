import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { ProgressEntry } from "../types/nostr";

const emptyEntry: ProgressEntry = {
  topic: "",
  notes: "",
  score: undefined,
  bookingId: ""
};

type ProgressEntryFormProps = {
  onSubmit: (entry: ProgressEntry) => void;
};

export function ProgressEntryForm({ onSubmit }: ProgressEntryFormProps) {
  const { t } = useI18n();
  const [entry, setEntry] = useState<ProgressEntry>(emptyEntry);

  return (
    <form
      className="progress-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!entry.topic.trim()) {
          return;
        }
        onSubmit(entry);
        setEntry(emptyEntry);
      }}
    >
      <h3>{t("progress.title")}</h3>
      <label>
        {t("progress.topic")}
        <input
          value={entry.topic}
          onChange={(event) => setEntry({ ...entry, topic: event.target.value })}
          placeholder={t("progress.topicPlaceholder")}
        />
      </label>
      <label>
        {t("progress.notes")}
        <textarea
          rows={3}
          value={entry.notes}
          onChange={(event) => setEntry({ ...entry, notes: event.target.value })}
          placeholder={t("progress.notesPlaceholder")}
        />
      </label>
      <label>
        {t("progress.scoreOptional")}
        <input
          type="number"
          min="0"
          max="10"
          value={entry.score ?? ""}
          onChange={(event) =>
            setEntry({
              ...entry,
              score: event.target.value ? Number(event.target.value) : undefined
            })
          }
        />
      </label>
      <label>
        {t("progress.bookingIdOptional")}
        <input
          value={entry.bookingId}
          onChange={(event) =>
            setEntry({ ...entry, bookingId: event.target.value })
          }
          placeholder={t("progress.bookingIdPlaceholder")}
        />
      </label>
      <button type="submit">{t("progress.send")}</button>
    </form>
  );
}
