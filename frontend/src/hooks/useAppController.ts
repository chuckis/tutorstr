import { useEffect, useState } from "react";
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
import { useTutorDirectory } from "./useTutorDirectory";
import { useTutorProfile } from "./useTutorProfile";
import { useTutorSchedule } from "./useTutorSchedule";
import { useTutorSchedules } from "./useTutorSchedules";
import { useRelays } from "./useRelays";
import { useI18n } from "../i18n/I18nProvider";

export function useAppController(onLogout: () => void) {
  const { t } = useI18n();
  const navigation = useAppNavigation();
  const [discoverStatus, setDiscoverStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const keypair = useNostrKeypair();
  const profileState = useTutorProfile(keypair.pubkey);
  const scheduleState = useTutorSchedule(keypair.pubkey);
  const directoryState = useTutorDirectory();
  const schedulesState = useTutorSchedules();
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
  const lessonNoteState = useLessonNote(
    keypair.pubkey,
    navigation.selectedLesson
  );
  const { sendMessage } = usePrivateMessagingActions();
  const messageIndicators = useMessageIndicators(
    keypair.pubkey,
    messagesState.messages,
    [...bookingsState.incoming, ...bookingsState.outgoing],
    lessonsState.lessons
  );

  useEffect(() => {
    if (!navigation.selectedRequest) {
      return;
    }

    messageIndicators.markRead(
      "requests",
      requestMessageThreadKey(navigation.selectedRequest.request)
    );
  }, [messageIndicators, navigation.selectedRequest]);

  useEffect(() => {
    if (!navigation.selectedLesson) {
      return;
    }

    messageIndicators.markRead(
      "lessons",
      lessonMessageThreadKey(navigation.selectedLesson)
    );
  }, [messageIndicators, navigation.selectedLesson]);

  const actions = useAppActions({
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
    setDiscoverStatus,
    setMessageStatus,
    onLogout
  });

  const viewModel = useAppViewModel({
    viewerPubkey: keypair.pubkey,
    viewerName: profileState.profile.name,
    requestSegment: navigation.requestSegment,
    incomingRequests: bookingsState.incoming,
    outgoingRequests: bookingsState.outgoing
  });

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
    actions,
    viewModel,
    publishBookingRequest
  };
}
