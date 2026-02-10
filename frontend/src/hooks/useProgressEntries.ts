import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "../nostr/client";
import { ProgressEntry, ProgressEntryEvent } from "../types/nostr";
import { getTagValue } from "../utils/nostrTags";

export function useProgressEntries(pubkey: string) {
  const [entries, setEntries] = useState<ProgressEntryEvent[]>([]);

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

    const incoming = nostrClient.subscribe(
      { kinds: [30004], "#p": [pubkey], limit: 200 },
      async (event) => {
        const plaintext = await nostrClient.decryptContent(
          event.pubkey,
          event.content
        );
        if (!plaintext) {
          return;
        }
        try {
          const parsed = JSON.parse(plaintext) as ProgressEntry;
          pushEntry({
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            counterparty: event.pubkey,
            entry: parsed
          });
        } catch {
          // ignore
        }
      }
    );

    const outgoing = nostrClient.subscribe(
      { kinds: [30004], authors: [pubkey], limit: 200 },
      async (event) => {
        const recipient = getTagValue(event.tags, "p");
        if (!recipient) {
          return;
        }
        const plaintext = await nostrClient.decryptContent(
          recipient,
          event.content
        );
        if (!plaintext) {
          return;
        }
        try {
          const parsed = JSON.parse(plaintext) as ProgressEntry;
          pushEntry({
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            counterparty: recipient,
            entry: parsed
          });
        } catch {
          // ignore
        }
      }
    );

    return () => {
      incoming();
      outgoing();
    };
  }, [pubkey]);

  const byCounterparty = useMemo(() => {
    return entries.reduce<Record<string, ProgressEntryEvent[]>>((acc, entry) => {
      acc[entry.counterparty] = acc[entry.counterparty] || [];
      acc[entry.counterparty].push(entry);
      return acc;
    }, {});
  }, [entries]);

  return { entries, byCounterparty };
}
