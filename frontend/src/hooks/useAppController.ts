import { useState } from "react";
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
import { useRequestAlerts } from "./useRequestAlerts";
import { useTutorDirectory } from "./useTutorDirectory";
import { useTutorProfile } from "./useTutorProfile";
import { useTutorSchedule } from "./useTutorSchedule";
import { useTutorSchedules } from "./useTutorSchedules";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";

export function useAppController(onLogout: () => void) {
  const { t } = useI18n();
  const navigation = useAppNavigation();
  const [relayInput, setRelayInput] = useState(nostrClient.getRelays().join(", "));
  const [relayStatus, setRelayStatus] = useState("");
  const [discoverStatus, setDiscoverStatus] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  const keypair = useNostrKeypair();
  const profileState = useTutorProfile(keypair.pubkey);
  const scheduleState = useTutorSchedule(keypair.pubkey);
  const directoryState = useTutorDirectory();
  const schedulesState = useTutorSchedules();
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

  const alertsState = useRequestAlerts({
    activeTab: navigation.activeTab,
    currentUserId: keypair.pubkey,
    incomingBookings: bookingsState.incoming,
    latestIncomingRequestTs: bookingsState.latestIncomingRequestTs,
    messages: messagesState.messages
  });

  const actions = useAppActions({
    studentPubkey: keypair.pubkey,
    studentNpub: keypair.npub,
    relayInput,
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
    setRelayStatus,
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
    relayInput,
    setRelayInput,
    relayStatus,
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
    alertsState,
    actions,
    viewModel,
    publishBookingRequest
  };
}
