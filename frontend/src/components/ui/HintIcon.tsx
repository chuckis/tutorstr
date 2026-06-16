import { ReactNode, useState, useEffect } from "react";
import { useHint } from "../../hooks/useHint";
import { HintPopover } from "./HintPopover";

type HintIconProps = {
  hintId: string;
  content: string | ReactNode;
  title?: string;
  maxViews?: number;
};

export function HintIcon({
  hintId,
  content,
  title,
  maxViews
}: HintIconProps) {
  const { isVisible, isNew, markSectionVisit, markOpened, dismiss } = useHint(
    hintId,
    { maxViews }
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    markSectionVisit();
  }, []);

  function handleClick() {
    setOpen(true);
    markOpened();
  }

  return (
    <span className="hint-icon-wrapper">
      {isVisible ? (
        <button
          type="button"
          className={`hint-icon ${isNew ? "hint-icon--new" : ""}`}
          onClick={handleClick}
          aria-label="Help"
        >
          &#9432;
        </button>
      ) : null}
      {open ? (
        <HintPopover
          title={title}
          content={content}
          onClose={() => setOpen(false)}
          onDismiss={() => {
            dismiss();
            setOpen(false);
          }}
        />
      ) : null}
    </span>
  );
}
