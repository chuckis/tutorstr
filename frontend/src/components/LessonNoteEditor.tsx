import { useCallback } from "react";
import { useI18n } from "../i18n/I18nProvider";

type ActionStatus = "idle" | "saving" | "published" | "shared" | "error";

type LessonNoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onShare: () => void;
  publishStatus?: ActionStatus;
  shareStatus?: ActionStatus;
};

function statusLabel(
  status: ActionStatus,
  idleLabel: string,
  savingLabel: string,
  doneLabel: string,
  t: (key: string) => string
): string {
  switch (status) {
    case "saving":
      return savingLabel;
    case "published":
    case "shared":
      return doneLabel;
    case "error":
      return t("common.states.error");
    default:
      return idleLabel;
  }
}

export function LessonNoteEditor({
  value,
  onChange,
  onSave,
  onPublish,
  onShare,
  publishStatus = "idle",
  shareStatus = "idle",
}: LessonNoteEditorProps) {
  const { t } = useI18n();
  const isEmpty = !value.trim();
  const isBusy = publishStatus === "saving" || shareStatus === "saving";

  return (
    <div className="lesson-note-editor">
      <label className="filter">
        {t("lessons.personalNote")}
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isBusy}
        />
      </label>
      <div className="lesson-note-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={isEmpty || isBusy}
        >
          {t("lessons.saveLocally")}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={isEmpty || isBusy}
        >
          {statusLabel(publishStatus, t("lessons.publish"), t("common.states.saving"), t("lessons.published"), t)}
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={isEmpty || isBusy}
        >
          {statusLabel(shareStatus, t("common.actions.share"), t("common.states.saving"), t("lessons.shared"), t)}
        </button>
      </div>
    </div>
  );
}
