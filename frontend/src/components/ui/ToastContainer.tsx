import { X } from "lucide-react";
import { useEffect, useCallback } from "react";
import type { NotificationAction, NotificationType } from "../../ports/notificationService";

export type ToastData = {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  action?: NotificationAction;
};

type ToastContainerProps = {
  toasts: ToastData[];
  onClose: (id: string) => void;
};

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: (id: string) => void }) {
  const handleClose = useCallback(() => onClose(toast.id), [onClose, toast.id]);

  useEffect(() => {
    const timer = setTimeout(handleClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, handleClose]);

  return (
    <div className={`ui-toast ui-toast--${toast.type}`} role="alert">
      <span className="ui-toast__message">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="ui-toast__action"
          onClick={() => {
            toast.action?.onClick();
            handleClose();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="ui-toast__close" onClick={handleClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
