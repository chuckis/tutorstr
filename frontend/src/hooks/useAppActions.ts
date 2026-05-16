import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TimeSlot } from "../domain/TimeSlot";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import { Lesson, LessonStatus } from "../domain/lesson";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { useI18n } from "../i18n/I18nProvider";

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
      requestedSlot: TimeSlot;
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
  onLogout: () => void;
};

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

export function useAppActions({
  studentPubkey,
  studentNpub,
  publishBookingRequest,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  bookingRepository,
  lessonRepository,
  acceptBooking,
  sendMessage,
  setDiscoverStatus,
  setMessageStatus,
  // setRelayStatus,
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
      requestedSlot: TimeSlot;
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

  async function requestPublishedSlot(tutorPubkey: string, slot: TimeSlot) {
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
    logout
  };
}
