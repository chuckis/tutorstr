import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { emitEvent } from "./eventBus";

const ALL_KINDS = [
  TutorHubKind.DirectMessage,     // 4
  TutorHubKind.Profile,           // 30000
  TutorHubKind.TutorSchedule,     // 30001
  TutorHubKind.BookingRequest,    // 30002
  TutorHubKind.BookingStatus,     // 30003
  TutorHubKind.StudentProgress,   // 30004
  TutorHubKind.LessonAgreement,   // 30006
  TutorHubKind.TutorBlogPost,    // 30005
];

let shutdown: (() => void) | null = null;

export function startGlobalSubscription(): void {
  if (shutdown) return;

  const unsubscribe = nostrClient.subscribe(
    { kinds: ALL_KINDS, since: Math.floor(Date.now() / 1000) - 30 * 24 * 3600 },
    (event) => {
      emitEvent(event);
    },
  );

  shutdown = () => {
    unsubscribe();
    shutdown = null;
  };
}

export function stopGlobalSubscription(): void {
  shutdown?.();
}
