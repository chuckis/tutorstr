import { create } from "zustand";
import type { NostrEvent } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import { UserProfile } from "../domain/profile";
import { normalizeProfile } from "../utils/normalize";

export type ProfileEntry = {
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  profile: UserProfile;
};

interface ProfileState {
  byPubkey: Record<string, ProfileEntry>;
  hydrated: boolean;
  ingest: (event: NostrEvent) => void;
  setHydrated: (v: boolean) => void;
  /** Optimistic: set a user's profile without waiting for relay echo. */
  optimisticSetProfile: (pubkey: string, profile: UserProfile) => void;
  /** Snapshot current profile for a pubkey (for rollback). */
  snapshotProfile: (pubkey: string) => ProfileEntry | undefined;
  /** Restore a profile from snapshot. */
  restoreProfile: (pubkey: string, snapshot: ProfileEntry | undefined) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  byPubkey: {},
  hydrated: false,

  ingest(event) {
    if (event.kind !== TutorHubKind.Metadata && event.kind !== 30000) return;
    try {
      const parsed = normalizeProfile(JSON.parse(event.content));
      set((s) => {
        const existing = s.byPubkey[event.pubkey];
        if (existing && existing.created_at >= event.created_at) return s;
        return {
          byPubkey: {
            ...s.byPubkey,
            [event.pubkey]: {
              pubkey: event.pubkey,
              created_at: event.created_at,
              tags: event.tags,
              content: event.content,
              profile: parsed,
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

  optimisticSetProfile(pubkey, profile) {
    set((s) => {
      const existing = s.byPubkey[pubkey];
      return {
        byPubkey: {
          ...s.byPubkey,
          [pubkey]: {
            pubkey,
            created_at: existing?.created_at ?? Math.floor(Date.now() / 1000),
            tags: existing?.tags ?? [],
            content: existing?.content ?? "",
            profile,
          },
        },
      };
    });
  },

  snapshotProfile(pubkey) {
    return get().byPubkey[pubkey];
  },

  restoreProfile(pubkey, snapshot) {
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
