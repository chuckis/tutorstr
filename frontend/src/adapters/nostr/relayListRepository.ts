import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import type { NostrEvent } from "../../nostr/client";
import type { RelayListItem, RelayList } from "../../domain/relayList";
import { getTagValues } from "../../utils/nostrTags";

export function parseRelayListEvent(event: NostrEvent): RelayList {
  const rTags = getTagValues(event.tags, "r");
  const relays: RelayListItem[] = rTags.map((value) => {
    const parts = value.split(" ");
    const url = parts[0];
    const purpose = parts[1] === "write" ? "write" : "read";
    return { url, purpose };
  });

  return {
    pubkey: event.pubkey,
    relays,
  };
}

export function createNostrRelayListRepository() {
  async function fetchRelayList(pubkey: string): Promise<RelayList | null> {
    const events = await nostrClient.query({
      kinds: [TutorHubKind.RelayListMetadata],
      authors: [pubkey],
      limit: 1,
    });

    if (events.length === 0) return null;

    const latest = events.reduce((a, b) =>
      a.created_at > b.created_at ? a : b
    );

    return parseRelayListEvent(latest);
  }

  async function publishRelayList(relays: RelayListItem[]): Promise<void> {
    const tags = relays.map((r) => ["r", r.url, r.purpose]);
    await nostrClient.publishReplaceableEvent(
      TutorHubKind.RelayListMetadata,
      "",
      tags,
    );
  }

  return {
    fetchRelayList,
    publishRelayList,
  };
}
