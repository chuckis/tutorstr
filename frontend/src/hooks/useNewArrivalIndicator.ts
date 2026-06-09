import { useCallback, useMemo, useState } from "react";

type Surface = "requests" | "lessons";

function storageKey(surface: Surface, userId: string) {
  return `tutorhub:new-arrival:${surface}:${userId}`;
}

function loadSeenIds(surface: Surface, userId: string): Set<string> {
  try {
    const stored = localStorage.getItem(storageKey(surface, userId));
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

function persistSeenIds(surface: Surface, userId: string, ids: Set<string>) {
  localStorage.setItem(storageKey(surface, userId), JSON.stringify([...ids]));
}

export function useNewArrivalIndicator<T extends { id: string }>(
  userId: string,
  surface: Surface,
  items: T[]
) {
  const [seenIds, setSeenIds] = useState<Set<string>>(() =>
    loadSeenIds(surface, userId)
  );

  const newCount = useMemo(
    () => items.filter((item) => !seenIds.has(item.id)).length,
    [items, seenIds]
  );

  const markAllSeen = useCallback(() => {
    const updated = new Set(items.map((item) => item.id));
    setSeenIds(updated);
    persistSeenIds(surface, userId, updated);
  }, [items, surface, userId]);

  return { newCount, markAllSeen };
}
