import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { emitEvent } from "./eventBus";
import type { NostrFilter } from "../../nostr/client";

const ALL_KINDS = [
  TutorHubKind.DirectMessage,     // 4
  0,                              // Metadata (NIP-01)
  TutorHubKind.MuteList,          // 10000
  TutorHubKind.Report,            // 1984
  TutorHubKind.TutorSchedule,     // 30001
  TutorHubKind.BookingRequest,    // 30002
  TutorHubKind.BookingStatus,     // 30003
  TutorHubKind.StudentProgress,   // 30004
  TutorHubKind.LessonAgreement,   // 30006
  TutorHubKind.TutorBlogPost,     // 30005
  TutorHubKind.Review,            // 32267
];

let shutdown: (() => void) | null = null;

const perUserSubscriptions = new Map<string, () => void>();

export function startGlobalSubscription(): void {
  if (shutdown) return;

  const unsubscribe = nostrClient.subscribe(
    { kinds: ALL_KINDS },
    (event) => { emitEvent(event); }
  );

  shutdown = () => {
    unsubscribe();
    shutdown = null;
  };
}

export function stopGlobalSubscription(): void {
  shutdown?.();
}

export function addPerUserSubscription(
  pubkey: string,
  relays: string[],
  kinds: number[],
  since?: number,
): () => void {
  removePerUserSubscription(pubkey);

  const filter: NostrFilter = { kinds };
  if (since) {
    filter.since = since;
  }

  const unsubscribe = nostrClient.subscribeToRelays(
    relays,
    filter,
    (event) => { emitEvent(event); },
  );

  perUserSubscriptions.set(pubkey, unsubscribe);

  return () => removePerUserSubscription(pubkey);
}

export function removePerUserSubscription(pubkey: string): void {
  const unsub = perUserSubscriptions.get(pubkey);
  if (unsub) {
    unsub();
    perUserSubscriptions.delete(pubkey);
  }
}

export function clearAllPerUserSubscriptions(): void {
  for (const [pubkey] of perUserSubscriptions) {
    removePerUserSubscription(pubkey);
  }
}
