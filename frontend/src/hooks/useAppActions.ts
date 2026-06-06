import { AccountRole } from "../domain/account";
import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TimeSlot } from "../domain/TimeSlot";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import { Lesson, LessonStatus } from "../domain/lesson";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { useI18n } from "../i18n/I18nProvider";
import { ChangeLessonStatus } from "../application/usecases/changeLessonStatus";
import { CancelBooking } from "../application/usecases/cancelBooking";
import {
  CreateBookingRequest,
  BookingRequestPayload
} from "../application/usecases/createBookingRequest";

type AcceptBookingUseCase = {
  execute: (bookingId: string, viewerRole: AccountRole) => Promise<void>;
};

type UseAppActionsProps = {
  viewerRole: AccountRole;
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
  sendMessage: (recipientPubkey: string, text: string, threadKey?: string) => Promise<void>;
  sendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    blossomUrl: string,
    threadKey?: string
  ) => Promise<void>;
  blossomUrl: string;
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
  viewerRole,
  studentPubkey,
  studentNpub,
  publishBookingRequest,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  bookingRepository,
  lessonRepository,
  acceptBooking,
  sendMessage,
  sendMessageWithFiles,
  blossomUrl,
  setDiscoverStatus,
  setMessageStatus,
  onLogout
}: UseAppActionsProps) {
  const { t } = useI18n();

  const changeLessonStatusUseCase = new ChangeLessonStatus(
    lessonRepository,
    bookingRepository
  );
  const cancelBookingUseCase = new CancelBooking(bookingRepository);
  const createBookingRequestUseCase = new CreateBookingRequest(
    publishBookingRequest
  );

  async function respondToBooking(request: Booking, nextStatus: "accepted" | "rejected") {
    if (nextStatus !== "accepted") {
      await bookingRepository.updateStatus(request.id, nextStatus);
      return;
    }

    await acceptBooking.execute(request.id, viewerRole);
  }

  async function changeLessonStatus(lesson: Lesson, nextStatus: LessonStatus) {
    if (nextStatus !== "completed" && nextStatus !== "canceled") {
      return;
    }

    await changeLessonStatusUseCase.execute(
      lesson,
      nextStatus,
      viewerRole,
      studentPubkey
    );
  }

  async function cancelRequestFromStudent(request: Booking) {
    await cancelBookingUseCase.execute(request, viewerRole);
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
      const bookingRequestPayload: BookingRequestPayload = {
        tutorPubkey,
        ...payload,
        slotAllocationKey
      };
      await createBookingRequestUseCase.execute(
        bookingRequestPayload,
        viewerRole
      );
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

  async function sendEncryptedMessage(
    recipientPubkey: string,
    text: string,
    threadKey?: string
  ) {
    setMessageStatus("");

    try {
      await sendMessage(recipientPubkey, text, threadKey);
    } catch (error) {
      setMessageStatus(
        toLocalizedErrorMessage(error, t) || t("common.buttons.sendMessage")
      );
    }
  }

  async function sendEncryptedMessageWithFiles(
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) {
    setMessageStatus("");

    try {
      await sendMessageWithFiles(recipientPubkey, text, files, blossomUrl, threadKey);
      setMessageStatus(t("common.messages.attachmentsSent"));
    } catch (error) {
      setMessageStatus(
        toLocalizedErrorMessage(error, t) || t("common.messages.uploadFailed")
      );
      throw error;
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
    sendEncryptedMessageWithFiles,
    logout
  };
}
