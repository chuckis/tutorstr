import { SelectHTMLAttributes } from "react";

type SelectOption = { value: string; label: string };

type SelectProps = {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ label, error, options, placeholder, className, id, ...rest }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const classes = ["ui-select", error ? "ui-select--error" : "", className || ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {label ? <label className="ui-select__label" htmlFor={selectId}>{label}</label> : null}
      <div className="ui-select__wrapper">
        <select id={selectId} className="ui-select__field" {...rest}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error ? <span className="ui-select__error">{error}</span> : null}
    </div>
  );
}
