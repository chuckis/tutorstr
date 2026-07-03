import { create } from "zustand";
import { nip19 } from "nostr-tools";
import type { AIAssistantState } from "./types";

const STORAGE_KEY = "tutorhub:ai-assistant";

function loadConfig(): { isEnabled: boolean; assistantPubkey: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isEnabled: typeof parsed.isEnabled === "boolean" ? parsed.isEnabled : false,
        assistantPubkey: typeof parsed.assistantPubkey === "string" ? parsed.assistantPubkey : null,
      };
    }
  } catch {
    // ignore
  }
  return { isEnabled: false, assistantPubkey: null };
}

function persistConfig(isEnabled: boolean, assistantPubkey: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isEnabled, assistantPubkey }));
  } catch {
    // ignore
  }
}

const initial = loadConfig();

export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  isEnabled: initial.isEnabled,
  assistantPubkey: initial.assistantPubkey,
  isAvailable: false,
  checkedAt: null,

  setEnabled: (v: boolean) => {
    set((s) => {
      persistConfig(v, s.assistantPubkey);
      return { isEnabled: v };
    });
  },

  setPubkey: (key: string) => {
    const hex = key.startsWith("npub1")
      ? (() => { try { return nip19.decode(key).data as string; } catch { return key; } })()
      : key;
    set((s) => {
      persistConfig(s.isEnabled, hex);
      return { assistantPubkey: hex || null };
    });
  },

  setAvailable: (v: boolean) => {
    set({ isAvailable: v, checkedAt: Date.now() });
  },

  reset: () => {
    persistConfig(false, null);
    set({ isEnabled: false, assistantPubkey: null, isAvailable: false, checkedAt: null });
  },
}));
