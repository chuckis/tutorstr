import { useEffect, useMemo, useState } from "react";
import { AccountRole } from "../domain/account";
import { lessonMessageThreadKey, requestMessageThreadKey } from "../domain/messageThread";
import { useAppActions } from "./useAppActions";
import { useAppNavigation } from "./useAppNavigation";
import { useAppViewModel } from "./useAppViewModel";
import { useBookingActions } from "./useBookingActions";
import { useBookings } from "./useBookings";
import { useEncryptedMessages } from "./useEncryptedMessages";
import { useLessons } from "./useLessons";
import { useLessonNote } from "./useLessonNote";
import { useNostrKeypair } from "./useNostrKeypair";
import { usePrivateMessagingActions } from "./usePrivateMessagingActions";
import { usePublicAllocatedSlots } from "./usePublicAllocatedSlots";
import { useMessageIndicators } from "./useMessageIndicators";
import { useRequestsTabViewModel } from "./useRequestsTabViewModel";
import { useTutorDirectory } from "./useTutorDirectory";
import { useTutorProfile } from "./useTutorProfile";
import { useTutorSchedule } from "./useTutorSchedule";
import { useTutorSchedules } from "./useTutorSchedules";
import { useRelays } from "./useRelays";
import { useI18n } from "../i18n/I18nProvider";

function isRequestVisibleForBadge(
  request: { id: string; status: string },
  statusEvents: Record<string, { created_at: number }>,
  nowSec: number
): boolean {
  if (request.status === "accepted") return false;
  if (request.status === "rejected") {
    const ev = statusEvents[request.id];
    if (!ev) return false;
    if (nowSec - ev.created_at > 86400) return false;
  }
  return true;
}

export function useAppController(
  onLogout: () => void,
  viewerRole: AccountRole,
  blossomUrl: string
) {
  const { t } = useI18n();
  const navigation = useAppNavigation(viewerRole);
  const [discoverStatus, setDiscoverStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const keypair = useNostrKeypair();
  const profileState = useTutorProfile(keypair.pubkey, viewerRole);
  const scheduleState = useTutorSchedule(keypair.pubkey, viewerRole);
  const relay = useRelays();
  const { publishBookingRequest } = useBookingActions(keypair.pubkey);
  const bookingsState = useBookings(keypair.pubkey, {
    durationMin: 60,
    subject: t("requests.defaultSubject"),
    price: profileState.profile.hourlyRate || 0,
    currency: "USD"
  });
  const lessonsState = useLessons(keypair.pubkey);
  const messagesState = useEncryptedMessages(keypair.pubkey);
  const publicAllocationState = usePublicAllocatedSlots();
  const schedulesState = useTutorSchedules();

  const winnerByAllocationKey = {
    ...publicAllocationState.allocatedSlotsByKey,
    ...bookingsState.winnerByAllocationKey
  };
  const directoryState = useTutorDirectory(
    schedulesState.schedules,
    winnerByAllocationKey
  );
  const lessonNoteState = useLessonNote(
    keypair.pubkey,
    navigation.selectedLesson,
    viewerRole,
    blossomUrl
  );
  const { sendMessage, sendMessageWithFiles } = usePrivateMessagingActions();

  const requestsForBadge = useMemo(() => {
    const source = viewerRole === "student" ? bookingsState.outgoing : bookingsState.incoming;
    const now = Math.floor(Date.now() / 1000);
    return source.filter((r) => isRequestVisibleForBadge(r, bookingsState.statuses, now));
  }, [bookingsState.incoming, bookingsState.outgoing, bookingsState.statuses, viewerRole]);

  const messageIndicators = useMessageIndicators(
    keypair.pubkey,
    messagesState.messages,
    requestsForBadge,
    lessonsState.lessons,
    viewerRole
  );

  useEffect(() => {
    if (!navigation.selectedRequest) {
      return;
    }

    messageIndicators.markRead(
      "requests",
      requestMessageThreadKey(navigation.selectedRequest.request).threadKey
    );
  }, [messageIndicators, navigation.selectedRequest]);

  useEffect(() => {
    if (!navigation.selectedLesson) {
      return;
    }

    messageIndicators.markRead(
      "lessons",
      lessonMessageThreadKey(navigation.selectedLesson).threadKey
    );
  }, [messageIndicators, navigation.selectedLesson]);

  const visibleIncoming =
    viewerRole === "student" ? [] : bookingsState.incoming;

  const stateLoading = {
    discover: directoryState.loading || schedulesState.loading,
    requests: bookingsState.loading,
    lessons: lessonsState.loading || publicAllocationState.loading,
    profile: profileState.loading || scheduleState.loading
  };

  const actions = useAppActions({
    viewerRole,
    studentPubkey: keypair.pubkey,
    studentNpub: keypair.npub,
    relayInput: relay.relayInput,
    publishBookingRequest,
    activeBidBySlotAndStudent: bookingsState.activeBidBySlotAndStudent,
    winnerByAllocationKey: {
      ...publicAllocationState.allocatedSlotsByKey,
      ...bookingsState.winnerByAllocationKey
    },
    bookingRepository: bookingsState.bookingRepository,
    lessonRepository: lessonsState.lessonRepository,
    acceptBooking: bookingsState.acceptBooking,
    sendMessage,
    sendMessageWithFiles,
    blossomUrl,
    setDiscoverStatus,
    setMessageStatus,
    onLogout
  });

  const viewModel = useAppViewModel({
    viewerPubkey: keypair.pubkey,
    viewerName: profileState.profile.name,
    requestSegment: navigation.requestSegment,
    incomingRequests: visibleIncoming,
    outgoingRequests: bookingsState.outgoing
  });

  const requestTimestamps = useMemo(
    () => {
      const timestamps: Record<string, number> = {};
      for (const [bookingId, request] of Object.entries(bookingsState.requestMap)) {
        timestamps[bookingId] = request.created_at;
      }
      return timestamps;
    },
    [bookingsState.requestMap]
  );

  const requestsTabViewModel = useRequestsTabViewModel({
    selectedRequest: navigation.selectedRequest,
    requestSegment: navigation.requestSegment,
    requestItems: viewModel.requestItems,
    tutors: directoryState.tutors,
    getUnreadCount: (threadKey) =>
      messageIndicators.getUnreadCount("requests", threadKey),
    getUnreadTotal: (threadKeys) =>
      messageIndicators.getUnreadTotal("requests", threadKeys),
    requestTimestamps,
    statusEvents: bookingsState.statuses,
    viewerRole
  });

  async function respondToRequestById(
    requestId: string,
    nextStatus: "accepted" | "rejected"
  ) {
    const request = await bookingsState.getById(requestId);

    if (!request) {
      return;
    }

    await actions.respondToBooking(request, nextStatus);
  }

  async function cancelRequestById(requestId: string) {
    const request = await bookingsState.getById(requestId);

    if (!request) {
      return;
    }

    await actions.cancelRequestFromStudent(request);
  }

  return {
    navigation,
    relay,
    discoverStatus,
    messageStatus,
    keypair,
    profileState,
    scheduleState,
    directoryState,
    schedulesState,
    bookingsState,
    publicAllocationState,
    lessonsState,
    messagesState,
    lessonNoteState,
    messageIndicators,
    stateLoading,
    actions,
    requestActions: {
      respondToRequestById,
      cancelRequestById
    },
    viewModel,
    requestsTabViewModel,
    publishBookingRequest
  };
}
