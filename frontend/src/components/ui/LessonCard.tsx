import { ReactNode } from "react";
import { Card } from "./Card";

type LessonCardProps = {
  children?: ReactNode;
  onClick: () => void;
  className?: string;
};

export function LessonCard({ children, onClick, className }: LessonCardProps) {
  return (
    <Card
      hoverable
      padding="md"
      className={className}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div style={{ display: "grid", gap: "var(--space-1)" }}>
        {children}
      </div>
    </Card>
  );
}
