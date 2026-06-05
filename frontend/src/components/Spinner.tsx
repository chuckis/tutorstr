import { Loader2 } from "lucide-react";

type SpinnerProps = {
  label?: string;
  size?: number;
};

export function Spinner({ label, size = 24 }: SpinnerProps) {
  return (
    <div className="spinner" role="status">
      <Loader2 size={size} className="spinner-icon spin" aria-hidden="true" />
      {label ? <span className="spinner-label">{label}</span> : null}
    </div>
  );
}
