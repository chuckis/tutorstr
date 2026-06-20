import { useState, useEffect } from "react";
import { resolveRelaysForUser } from "../adapters/nostr/crossRelayResolver";

interface UseRelayListResult {
  relays: string[];
  loading: boolean;
}

export function useRelayList(pubkey: string | null): UseRelayListResult {
  const [relays, setRelays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pubkey) {
      setRelays([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveRelaysForUser(pubkey).then((result) => {
      if (cancelled) return;
      setRelays(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [pubkey]);

  return { relays, loading };
}
