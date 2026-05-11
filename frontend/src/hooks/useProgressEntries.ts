import { useEffect, useMemo, useState } from "react";
import { ProgressEntryEvent } from "../types/nostr";
import { usePrivateMessagingRepository } from "./usePrivateMessagingRepository";

export function useProgressEntries(pubkey: string) {
  const [entries, setEntries] = useState<ProgressEntryEvent[]>([]);
  const messagingRepository = usePrivateMessagingRepository();

  useEffect(() => {
    const pushEntry = (entry: ProgressEntryEvent) => {
      setEntries((prev) => {
        const exists = prev.find((item) => item.id === entry.id);
        if (exists) {
          return prev;
        }
        return [...prev, entry].sort((a, b) => b.created_at - a.created_at);
      });
    };

    return messagingRepository.subscribeProgressEntriesForUser(pubkey, pushEntry);
  }, [messagingRepository, pubkey]);

  const byCounterparty = useMemo(() => {
    return entries.reduce<Record<string, ProgressEntryEvent[]>>((acc, entry) => {
      acc[entry.counterparty] = acc[entry.counterparty] || [];
      acc[entry.counterparty].push(entry);
      return acc;
    }, {});
  }, [entries]);

  return { entries, byCounterparty };
}
