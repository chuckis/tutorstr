import { ReactNode } from "react";
import { Card } from "./Card";

type BookingCardProps = {
  children?: ReactNode;
  footer?: ReactNode;
  onOpen: () => void;
  className?: string;
};

export function BookingCard({ children, footer, onOpen, className }: BookingCardProps) {
  return (
    <Card
      hoverable
      padding="md"
      className={className}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        {children}
      </div>
      {footer ? (
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
