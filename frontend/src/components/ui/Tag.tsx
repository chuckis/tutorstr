import { X } from "lucide-react";
import { ReactNode } from "react";

type TagProps = {
  children?: ReactNode;
  onRemove?: () => void;
  className?: string;
};

export function Tag({ children, onRemove, className }: TagProps) {
  const classes = ["ui-tag", className || ""].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <span className="ui-tag__text">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="ui-tag__remove"
          onClick={onRemove}
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
}
