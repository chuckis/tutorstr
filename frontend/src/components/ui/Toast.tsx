import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

type ToastVariant = "success" | "error" | "info";

type ToastProps = {
  open: boolean;
  variant?: ToastVariant;
  message?: string;
  children?: ReactNode;
  onClose: () => void;
  duration?: number;
};

export function Toast({ open, variant = "info", message, children, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className={`ui-toast ui-toast--${variant}`} role="alert">
      <span className="ui-toast__message">{message || children}</span>
      <button type="button" className="ui-toast__close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}
