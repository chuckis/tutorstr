import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { emitEvent } from "./eventBus";
import { useProfileStore } from "../../stores/profileStore";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useBookingStore } from "../../stores/bookingStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useMessageStore } from "../../stores/messageStore";

const HYDRATION_KINDS = [
  TutorHubKind.DirectMessage,     // 4
  TutorHubKind.Metadata,          // 0
  TutorHubKind.MuteList,          // 10000
  TutorHubKind.Report,            // 1984
  TutorHubKind.Profile,           // 30000 (deprecated, kept for compat)
  TutorHubKind.TutorSchedule,     // 30001
  TutorHubKind.BookingRequest,    // 30002
  TutorHubKind.BookingStatus,     // 30003
  TutorHubKind.StudentProgress,   // 30004
  TutorHubKind.TutorBlogPost,     // 30005
  TutorHubKind.LessonAgreement,   // 30006
  TutorHubKind.Review,            // 32267
];

let shutdownHydration: (() => void) | null = null;
let eoseCount = 0;
const EXPECTED_EOSE = HYDRATION_KINDS.length;

function markAllHydrated(): void {
  useProfileStore.getState().setHydrated(true);
  useScheduleStore.getState().setHydrated(true);
  useBookingStore.getState().setHydrated(true);
  useLessonStore.getState().setHydrated(true);
  useMessageStore.getState().setHydrated(true);
}

export function startHydration(): void {
  if (shutdownHydration) return;

  eoseCount = 0;

  const unsub = nostrClient.subscribe(
    HYDRATION_KINDS.map(kind => ({ kinds: [kind], limit: 100 })),
    (event) => { emitEvent(event); },
    {
      onEose: () => {
        eoseCount++;
        // Wait for all kinds to settle before marking hydrated
        // (nostr-tools fires one EOSE per filter)
        if (eoseCount >= EXPECTED_EOSE) {
          markAllHydrated();
        }
      },
    },
  );

  shutdownHydration = () => {
    unsub();
    shutdownHydration = null;
  };
}

export function stopHydration(): void {
  shutdownHydration?.();
}

export function isHydrated(): boolean {
  return (
    useProfileStore.getState().hydrated &&
    useScheduleStore.getState().hydrated &&
    useBookingStore.getState().hydrated &&
    useLessonStore.getState().hydrated &&
    useMessageStore.getState().hydrated
  );
}
