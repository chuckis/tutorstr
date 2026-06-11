import { TextareaHTMLAttributes } from "react";

type TextareaProps = {
  label?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, error, className, id, ...rest }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const classes = ["ui-textarea", error ? "ui-textarea--error" : "", className || ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {label ? <label className="ui-textarea__label" htmlFor={textareaId}>{label}</label> : null}
      <textarea id={textareaId} className="ui-textarea__field" {...rest} />
      {error ? <span className="ui-textarea__error">{error}</span> : null}
    </div>
  );
}
