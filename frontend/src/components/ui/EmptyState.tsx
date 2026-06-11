import { ReactNode } from "react";
import { Button } from "./Button";

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      {icon ? <div className="ui-empty-state__icon">{icon}</div> : null}
      {title ? <h3 className="ui-empty-state__title">{title}</h3> : null}
      {description ? <p className="ui-empty-state__desc">{description}</p> : null}
      {action ? (
        <Button variant="secondary" onClick={action.onClick} className="ui-empty-state__action">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
