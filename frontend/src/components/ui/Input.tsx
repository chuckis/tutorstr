import { InputHTMLAttributes, ReactNode } from "react";

type InputProps = {
  label?: string;
  error?: string;
  icon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, icon, className, id, ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const classes = ["ui-input", error ? "ui-input--error" : "", className || ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {label ? <label className="ui-input__label" htmlFor={inputId}>{label}</label> : null}
      <div className="ui-input__wrapper">
        {icon ? <span className="ui-input__icon">{icon}</span> : null}
        <input id={inputId} className="ui-input__field" {...rest} />
      </div>
      {error ? <span className="ui-input__error">{error}</span> : null}
    </div>
  );
}
