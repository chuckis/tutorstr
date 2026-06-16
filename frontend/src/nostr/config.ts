const STORAGE_KEY = "tutorhub:relays";

export const DEFAULT_RELAYS = (() => {
  const envRelays = import.meta.env.VITE_NOSTR_RELAYS;
  if (envRelays) {
    const relays = envRelays
      .split(",")
      .map((relay) => relay.trim())
      .filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relays));
    return relays;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch { /* fall through */ }
  }

  return ["wss://relay.damus.io", "wss://relay.primal.net", "wss://relay.nostr.band"];
})();
