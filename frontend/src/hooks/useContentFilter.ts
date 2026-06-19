import { useMemo } from "react";
import { filterMuted } from "../domain/moderation";

export function useContentFilter<T extends { pubkey: string }>(
  items: T[],
  mutedPubkeys: Set<string>,
): T[] {
  return useMemo(
    () => filterMuted(items, mutedPubkeys),
    [items, mutedPubkeys],
  );
}
