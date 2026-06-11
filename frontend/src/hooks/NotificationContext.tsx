import { createContext, ReactNode, useContext, useMemo, useState, useCallback } from "react";
import { NotificationService } from "../ports/notificationService";
import { NotificationManager } from "../adapters/notificationService";
import { ToastContainer } from "../components/ui/ToastContainer";
import type { ToastData } from "../components/ui/ToastContainer";

const NotificationContext = createContext<NotificationService | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toastList, setToastList] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToastList((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const manager = useMemo<NotificationService>(() => {
    let counter = 0;
    return new NotificationManager((entry) => {
      const id = `toast-${++counter}`;
      setToastList((prev) => [...prev, { ...entry, id }]);
      return id;
    });
  }, []);

  return (
    <NotificationContext.Provider value={manager}>
      {children}
      <ToastContainer toasts={toastList} onClose={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationService {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}
