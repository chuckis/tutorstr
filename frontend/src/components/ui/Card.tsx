import { HTMLAttributes, ReactNode } from "react";

type CardVariant = "elevated" | "outlined" | "flat";

type CardProps = {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Card({
  variant = "elevated",
  padding = "md",
  hoverable,
  children,
  className,
  ...rest
}: CardProps) {
  const classes = [
    "ui-card",
    `ui-card--${variant}`,
    `ui-card--pad-${padding}`,
    hoverable ? "ui-card--hoverable" : "",
    className || ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
