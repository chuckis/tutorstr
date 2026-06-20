import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { emitEvent, useEventBusStore } from "./eventBus";

const POLLING_KINDS = [
  TutorHubKind.BookingRequest,    // 30002
  TutorHubKind.BookingStatus,     // 30003
  TutorHubKind.LessonAgreement,   // 30006
  TutorHubKind.TutorBlogPost,     // 30005
  TutorHubKind.Review,            // 32267
  TutorHubKind.TutorSchedule,     // 30001
];

const POLL_INTERVAL = 60_000; // 60 seconds

let shutdownPolling: (() => void) | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function maxTimestamp(kind: number): number {
  const events = useEventBusStore.getState().eventsByKind[kind];
  if (!events) return 0;
  let max = 0;
  for (const e of Object.values(events)) {
    if (e.created_at > max) max = e.created_at;
  }
  return max;
}

async function pollOnce(): Promise<void> {
  if (shutdownPolling === null) return;

  for (const kind of POLLING_KINDS) {
    try {
      const since = maxTimestamp(kind);
      if (since === 0) continue;

      const events = await nostrClient.query({
        kinds: [kind],
        since,
        limit: 100,
      });

      for (const event of events) {
        emitEvent(event);
      }
    } catch {
      // Ignore relay errors in polling — will retry next cycle
    }
  }
}

export function startPolling(): void {
  if (shutdownPolling) return;

  // First poll immediately, then on interval
  pollOnce();
  intervalId = setInterval(pollOnce, POLL_INTERVAL);

  shutdownPolling = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    shutdownPolling = null;
  };
}

export function stopPolling(): void {
  shutdownPolling?.();
}
