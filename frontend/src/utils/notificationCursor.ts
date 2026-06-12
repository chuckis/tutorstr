const KEY = "tutorhub:last_seen_time";

export function getNotificationSince(): number {
  const stored = Number(localStorage.getItem(KEY));
  return stored || Math.floor(Date.now() / 1000) - 86400;
}

export function updateNotificationCursor(): void {
  localStorage.setItem(KEY, String(Math.floor(Date.now() / 1000)));
}
