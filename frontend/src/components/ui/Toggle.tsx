import { InputHTMLAttributes } from "react";

type ToggleProps = {
  label?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Toggle({ label, className, id, ...rest }: ToggleProps) {
  const toggleId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const classes = ["ui-toggle", className || ""].filter(Boolean).join(" ");

  return (
    <label className={classes} htmlFor={toggleId}>
      <span className="ui-toggle__label">{label}</span>
      <div className="ui-toggle__track">
        <input id={toggleId} type="checkbox" className="ui-toggle__input" {...rest} />
        <span className="ui-toggle__slider" aria-hidden="true" />
      </div>
    </label>
  );
}
