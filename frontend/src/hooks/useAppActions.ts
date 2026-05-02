import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import { Lesson, LessonStatus } from "../domain/lesson";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";
import { ScheduleSlot } from "../types/nostr";

type AcceptBookingUseCase = {
  execute: (bookingId: string) => Promise<void>;
};

type UseAppActionsProps = {
  studentPubkey: string;
  studentNpub: string;
  relayInput: string;
  publishBookingRequest: (
    tutorPubkey: string,
    payload: {
      requestedSlot: ScheduleSlot;
      message: string;
      studentNpub: string;
      slotAllocationKey?: string;
    }
  ) => Promise<unknown>;
  activeBidBySlotAndStudent: Record<string, Booking>;
  winnerByAllocationKey: Record<string, SlotOccupancy>;
  bookingRepository: BookingRepository;
  lessonRepository: LessonRepository;
  acceptBooking: AcceptBookingUseCase;
  sendMessage: (recipientPubkey: string, text: string) => Promise<void>;
  setDiscoverStatus: (value: string) => void;
  setMessageStatus: (value: string) => void;
  setRelayStatus: (value: string) => void;
  onLogout: () => void;
};

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

function parseRelayList(value: string) {
  return value
    .split(",")
    .map((relay) => relay.trim())
    .filter(Boolean);
}

export function useAppActions({
  studentPubkey,
  studentNpub,
  relayInput,
  publishBookingRequest,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  bookingRepository,
  lessonRepository,
  acceptBooking,
  sendMessage,
  setDiscoverStatus,
  setMessageStatus,
  setRelayStatus,
  onLogout
}: UseAppActionsProps) {
  const { t } = useI18n();

  async function respondToBooking(request: Booking, nextStatus: "accepted" | "rejected") {
    if (nextStatus !== "accepted") {
      await bookingRepository.updateStatus(request.id, nextStatus);
      return;
    }

    await acceptBooking.execute(request.id);
  }

  async function changeLessonStatus(lesson: Lesson, nextStatus: LessonStatus) {
    if (nextStatus !== "completed" && nextStatus !== "canceled") {
      return;
    }

    await lessonRepository.updateStatus(lesson.id, nextStatus);
  }

  async function cancelRequestFromStudent(request: Booking) {
    await bookingRepository.updateStatus(request.id, "cancelled");
  }

  async function requestBooking(
    tutorPubkey: string,
    payload: {
      requestedSlot: ScheduleSlot;
      message: string;
      studentNpub: string;
    }
  ) {
    setDiscoverStatus("");

    const slotAllocationKey = makeSlotAllocationKey(
      tutorPubkey,
      payload.requestedSlot
    );
    const slotBidKey = makeSlotBidKey(
      tutorPubkey,
      studentPubkey,
      payload.requestedSlot
    );
    const existingBid = activeBidBySlotAndStudent[slotBidKey];
    const winner = winnerByAllocationKey[slotAllocationKey];

    if (existingBid) {
      setDiscoverStatus(t("discover.activeRequestHint"));
      return;
    }

    if (winner && winner.studentId !== studentPubkey) {
      setDiscoverStatus(t("discover.unavailable"));
      return;
    }

    try {
      await publishBookingRequest(tutorPubkey, {
        ...payload,
        slotAllocationKey
      });
      setDiscoverStatus(t("discover.sendRequest"));
    } catch (error) {
      setDiscoverStatus(
        toLocalizedErrorMessage(error, t) || t("discover.sendRequest")
      );
    }
  }

  async function requestPublishedSlot(tutorPubkey: string, slot: ScheduleSlot) {
    await requestBooking(tutorPubkey, {
      requestedSlot: slot,
      message: "",
      studentNpub
    });
  }

  async function sendEncryptedMessage(recipientPubkey: string, text: string) {
    setMessageStatus("");

    try {
      await sendMessage(recipientPubkey, text);
    } catch (error) {
      setMessageStatus(
        toLocalizedErrorMessage(error, t) || t("common.buttons.sendMessage")
      );
    }
  }

  function updateRelays() {
    const parsed = parseRelayList(relayInput);
    if (parsed.length === 0) {
      setRelayStatus(t("common.validation.requiredRelay"));
      return;
    }

    nostrClient.setRelays(parsed);
    setRelayStatus(t("profile.saveRelays"));
  }

  function logout() {
    onLogout();
  }

  return {
    respondToBooking,
    changeLessonStatus,
    cancelRequestFromStudent,
    requestBooking,
    requestPublishedSlot,
    sendEncryptedMessage,
    updateRelays,
    logout
  };
}
