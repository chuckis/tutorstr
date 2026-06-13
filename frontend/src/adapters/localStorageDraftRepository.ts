import type { BlogDraft } from "../domain/blog";
import type { DraftRepository } from "../ports/draftRepository";

const STORAGE_KEY = "tutorstr:blog:drafts";

function isLocalStorageAvailable(): boolean {
  try {
    const key = "__tutorstr_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

let lsAvailable: boolean | null = null;

function checkLs(): boolean {
  if (lsAvailable === null) {
    lsAvailable = isLocalStorageAvailable();
  }
  return lsAvailable;
}

function loadAll(): BlogDraft[] {
  if (!checkLs()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BlogDraft[];
  } catch {
    console.warn("[DraftRepository] Failed to parse drafts from localStorage");
    return [];
  }
}

function saveAll(drafts: BlogDraft[]): void {
  if (!checkLs()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    console.warn("[DraftRepository] Failed to save drafts to localStorage");
  }
}

export function createLocalStorageDraftRepository(): DraftRepository {
  return {
    async save(draft: BlogDraft) {
      if (!checkLs()) return;
      const all = loadAll();
      const idx = all.findIndex((d) => d.id === draft.id);
      if (idx >= 0) {
        all[idx] = draft;
      } else {
        all.push(draft);
      }
      saveAll(all);
    },

    async getAll() {
      return loadAll();
    },

    async getById(id: string) {
      const all = loadAll();
      return all.find((d) => d.id === id) ?? null;
    },

    async delete(id: string) {
      if (!checkLs()) return;
      const all = loadAll().filter((d) => d.id !== id);
      saveAll(all);
    },
  };
}
