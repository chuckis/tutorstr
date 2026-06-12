import { useEffect } from "react";
import { updateNotificationCursor } from "../utils/notificationCursor";

const SAVE_INTERVAL_MS = 60000;

export function useNotificationCursor() {
  useEffect(() => {
    const save = () => updateNotificationCursor();

    const intervalId = setInterval(save, SAVE_INTERVAL_MS);

    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        save();
      }
    });

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, []);
}
