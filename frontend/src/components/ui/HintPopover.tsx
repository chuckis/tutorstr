import { ReactNode, useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useI18n } from "../../i18n/I18nProvider";

type HintPopoverProps = {
  title?: string;
  content: string | ReactNode;
  onClose: () => void;
  onDismiss: () => void;
};

export function HintPopover({
  title,
  content,
  onClose,
  onDismiss
}: HintPopoverProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <div className="hint-popover" ref={ref} role="tooltip">
      {title ? <strong className="hint-popover__title">{title}</strong> : null}
      <div className="hint-popover__body">
        {typeof content === "string" ? <p>{content}</p> : content}
      </div>
      <div className="hint-popover__actions">
        <button
          type="button"
          className="hint-popover__btn"
          onClick={onClose}
        >
          {t("hints.gotIt")}
        </button>
        <button
          type="button"
          className="hint-popover__btn hint-popover__btn--muted"
          onClick={onDismiss}
        >
          {t("hints.dontShow")}
        </button>
      </div>
    </div>
  );
}
