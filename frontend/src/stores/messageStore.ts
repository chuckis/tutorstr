import { create } from "zustand";
import type { NostrEvent } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import { getTagValue } from "../utils/nostrTags";

type RawMessage = {
  id: string;
  created_at: number;
  pubkey: string;
  kind: number;
  tags: string[][];
  content: string;
};

interface MessageState {
  byThreadKey: Record<string, RawMessage[]>;
  hydrated: boolean;
  ingest: (event: NostrEvent) => void;
  setHydrated: (v: boolean) => void;
  /** Optimistic: add a message to a thread. */
  optimisticAddMessage: (threadKey: string, msg: RawMessage) => void;
  /** Snapshot a thread for rollback. */
  snapshotThread: (threadKey: string) => RawMessage[] | undefined;
  /** Restore a thread from snapshot. */
  restoreThread: (threadKey: string, snapshot: RawMessage[] | undefined) => void;
}

function deriveThreadKey(event: NostrEvent, ownPubkey?: string): string {
  const pTag = getTagValue(event.tags, "p");
  if (pTag && ownPubkey) {
    return [ownPubkey, pTag].sort().join(":");
  }
  return event.pubkey;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  byThreadKey: {},
  hydrated: false,

  ingest(event) {
    if (
      event.kind !== TutorHubKind.DirectMessage &&
      event.kind !== TutorHubKind.StudentProgress
    ) {
      return;
    }

    const threadKey = deriveThreadKey(event);

    set((s) => {
      const existing = s.byThreadKey[threadKey] ?? [];
      const alreadyStored = existing.some(
        (m) => m.id === event.id && m.created_at >= event.created_at,
      );
      if (alreadyStored) return s;
      return {
        byThreadKey: {
          ...s.byThreadKey,
          [threadKey]: [...existing, {
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
          }],
        },
      };
    });
  },

  setHydrated(v) {
    set({ hydrated: v });
  },

  optimisticAddMessage(threadKey, msg) {
    set((s) => {
      const existing = s.byThreadKey[threadKey] ?? [];
      return {
        byThreadKey: {
          ...s.byThreadKey,
          [threadKey]: [...existing, msg],
        },
      };
    });
  },

  snapshotThread(threadKey) {
    return get().byThreadKey[threadKey];
  },

  restoreThread(threadKey, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.byThreadKey };
        delete next[threadKey];
        return { byThreadKey: next };
      });
      return;
    }
    set((s) => ({
      byThreadKey: { ...s.byThreadKey, [threadKey]: snapshot },
    }));
  },
}));
