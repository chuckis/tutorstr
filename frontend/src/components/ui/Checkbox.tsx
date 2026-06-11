import { InputHTMLAttributes } from "react";

type CheckboxProps = {
  label?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  const checkId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const classes = ["ui-checkbox", className || ""].filter(Boolean).join(" ");

  return (
    <label className={classes} htmlFor={checkId}>
      <input id={checkId} type="checkbox" className="ui-checkbox__input" {...rest} />
      <span className="ui-checkbox__indicator" aria-hidden="true" />
      {label ? <span className="ui-checkbox__label">{label}</span> : null}
    </label>
  );
}
