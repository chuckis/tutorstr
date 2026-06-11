import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { NotificationService } from "../ports/notificationService";
import { NotificationManager } from "../adapters/notificationService";
import { ToastContainer } from "../components/ui/ToastContainer";
import type { ToastData } from "../components/ui/ToastContainer";

const NotificationContext = createContext<NotificationService | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toastList, setToastList] = useState<ToastData[]>([]);
  const managerRef = useRef<NotificationManager | null>(null);

  const removeToast = useCallback((id: string) => {
    setToastList((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const manager = useMemo<NotificationManager>(() => {
    const instance = new NotificationManager((entry) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToastList((prev) => [...prev, { ...entry, id }]);
      return id;
    });
    managerRef.current = instance;
    return instance;
  }, []);

  useEffect(() => {
    function onUserGesture() {
      const m = managerRef.current;
      if (m) {
        m.initAudio();
      }
      document.removeEventListener("pointerdown", onUserGesture, true);
      document.removeEventListener("keydown", onUserGesture, true);
    }
    document.addEventListener("pointerdown", onUserGesture, true);
    document.addEventListener("keydown", onUserGesture, true);
    return () => {
      document.removeEventListener("pointerdown", onUserGesture, true);
      document.removeEventListener("keydown", onUserGesture, true);
    };
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
