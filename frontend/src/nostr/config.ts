export const DEFAULT_RELAYS = (() => {
  const envRelays = import.meta.env.VITE_NOSTR_RELAYS;
  if (envRelays) {
    return envRelays
      .split(",")
      .map((relay) => relay.trim())
      .filter(Boolean);
  }

  return ["wss://relay.damus.io", "wss://relay.primal.net"];
})();
