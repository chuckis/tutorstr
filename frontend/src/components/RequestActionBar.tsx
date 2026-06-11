import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

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
        <Button variant="primary" onClick={onAccept}>
          {t("requests.accept")}
        </Button>
      ) : null}
      {canDecline ? (
        <Button variant="ghost" onClick={onDecline}>
          {t("requests.decline")}
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="ghost" onClick={onCancel}>
          {t("requests.cancelRequest")}
        </Button>
      ) : null}
    </div>
  );
}
