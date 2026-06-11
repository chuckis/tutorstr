import { ReactNode } from "react";
import { BookingCard } from "./ui/BookingCard";

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
    <BookingCard
      onOpen={onOpen}
      className={className}
      footer={
        <div
          className="request-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {footer}
        </div>
      }
    >
      <div className="request-card-body">{children}</div>
    </BookingCard>
  );
}
