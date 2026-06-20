import { create } from "zustand";
import type { NostrEvent } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import { TutorSchedule } from "../domain/schedule";
import { normalizeSchedule } from "../utils/normalize";

export type ScheduleEntry = {
  pubkey: string;
  created_at: number;
  schedule: TutorSchedule;
};

interface ScheduleState {
  byPubkey: Record<string, ScheduleEntry>;
  hydrated: boolean;
  ingest: (event: NostrEvent) => void;
  setHydrated: (v: boolean) => void;
  /** Optimistic: set a tutor's schedule without waiting for relay echo. */
  optimisticSetSchedule: (pubkey: string, schedule: TutorSchedule) => void;
  /** Snapshot current schedule for a pubkey (for rollback). */
  snapshotSchedule: (pubkey: string) => ScheduleEntry | undefined;
  /** Restore a schedule from snapshot. */
  restoreSchedule: (pubkey: string, snapshot: ScheduleEntry | undefined) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  byPubkey: {},
  hydrated: false,

  ingest(event) {
    if (event.kind !== TutorHubKind.TutorSchedule) return;
    try {
      const parsed = normalizeSchedule(JSON.parse(event.content));
      set((s) => {
        const existing = s.byPubkey[event.pubkey];
        if (existing && existing.created_at >= event.created_at) return s;
        return {
          byPubkey: {
            ...s.byPubkey,
            [event.pubkey]: {
              pubkey: event.pubkey,
              created_at: event.created_at,
              schedule: parsed,
            },
          },
        };
      });
    } catch {
      // ignore malformed content
    }
  },

  setHydrated(v) {
    set({ hydrated: v });
  },

  optimisticSetSchedule(pubkey, schedule) {
    set((s) => {
      const existing = s.byPubkey[pubkey];
      return {
        byPubkey: {
          ...s.byPubkey,
          [pubkey]: {
            pubkey,
            created_at: existing?.created_at ?? Math.floor(Date.now() / 1000),
            schedule,
          },
        },
      };
    });
  },

  snapshotSchedule(pubkey) {
    return get().byPubkey[pubkey];
  },

  restoreSchedule(pubkey, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.byPubkey };
        delete next[pubkey];
        return { byPubkey: next };
      });
      return;
    }
    set((s) => ({
      byPubkey: { ...s.byPubkey, [pubkey]: snapshot },
    }));
  },
}));
