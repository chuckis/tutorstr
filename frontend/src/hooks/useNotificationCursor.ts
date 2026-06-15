import { useEffect } from "react";
import { updateNotificationCursor } from "../utils/notificationCursor";

const SAVE_INTERVAL_MS = 60000;

export function useNotificationCursor() {
  useEffect(() => {
  const save = () => updateNotificationCursor();

  const onVisibilityChange = () => {
    if (document.hidden) save();
  };

  const intervalId = setInterval(save, SAVE_INTERVAL_MS);
  window.addEventListener("beforeunload", save);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener("beforeunload", save);
    document.removeEventListener("visibilitychange", onVisibilityChange); // ← та же ссылка
  };
}, []);
}
