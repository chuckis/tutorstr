import { useEffect, useRef } from "react";
import { AccountRole } from "../domain/account";
import { PublishRelayList } from "../application/usecases/publishRelayList";
import { createNostrRelayListRepository } from "../adapters/nostr/relayListRepository";
import { nostrClient } from "../nostr/client";
import { clearRelayListCache } from "../adapters/nostr/crossRelayResolver";

export function usePublishRelayList(
  pubkey: string | null,
  viewerRole: AccountRole,
) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!pubkey) return;
    if (doneRef.current) return;
    doneRef.current = true;

    const repo = createNostrRelayListRepository();
    const useCase = new PublishRelayList(
      (relays) => repo.publishRelayList(relays),
    );

    repo.fetchRelayList(pubkey).then((existing) => {
      if (existing && existing.relays.length > 0) {
        clearRelayListCache(pubkey);
        return;
      }

      const currentRelays = nostrClient.getRelays();
      const relays = currentRelays.map((url) => ({
        url,
        purpose: "write" as const,
      }));

      return useCase.execute(relays, viewerRole).catch(() => {});
    });
  }, [pubkey, viewerRole]);
}
