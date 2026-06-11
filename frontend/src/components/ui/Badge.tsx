import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  variant?: BadgeVariant;
  children?: ReactNode;
  className?: string;
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const classes = ["ui-badge", `ui-badge--${variant}`, className || ""]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
