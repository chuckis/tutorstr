import { useI18n } from "../i18n/I18nProvider";

type RequestActionBarProps = {
  canAccept: boolean;
  canDecline: boolean;
  canCancel: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
};

export function RequestActionBar({
  canAccept,
  canDecline,
  canCancel,
  onAccept,
  onDecline,
  onCancel
}: RequestActionBarProps) {
  const { t } = useI18n();

  if (!canAccept && !canDecline && !canCancel) {
    return null;
  }

  return (
    <div className="request-action-bar">
      {canAccept ? (
        <button
          type="button"
          className="primary-action"
          onClick={onAccept}
        >
          {t("requests.accept")}
        </button>
      ) : null}
      {canDecline ? (
        <button
          type="button"
          className="ghost-action"
          onClick={onDecline}
        >
          {t("requests.decline")}
        </button>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          className="ghost-action"
          onClick={onCancel}
        >
          {t("requests.cancelRequest")}
        </button>
      ) : null}
    </div>
  );
}
