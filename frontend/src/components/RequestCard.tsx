import { ReactNode } from "react";

type RequestCardProps = {
  children: ReactNode;
  className?: string;
  footer: ReactNode;
  onOpen: () => void;
};

export function RequestCard({
  children,
  className,
  footer,
  onOpen
}: RequestCardProps) {
  return (
    <li
      className={`request-card ${className || ""}`.trim()}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="request-card-body">{children}</div>
      <div
        className="request-actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {footer}
      </div>
    </li>
  );
}
