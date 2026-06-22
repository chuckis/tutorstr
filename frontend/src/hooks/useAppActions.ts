import { AccountRole } from "../domain/account";
import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TimeSlot } from "../domain/TimeSlot";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import { Lesson, LessonStatus } from "../domain/lesson";
import { ReviewRating } from "../domain/review";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { ReviewRepository } from "../ports/reviewRepository";
import { NotificationService } from "../ports/notificationService";
import { LessonAgreementEvent } from "../ports/lessonAgreementEventsRepository";
import { useI18n } from "../i18n/I18nProvider";
import { ChangeLessonStatus } from "../application/usecases/changeLessonStatus";
import { CancelBooking } from "../application/usecases/cancelBooking";
import { PublishReview } from "../application/usecases/publishReview";
import { useReviewStore } from "../stores/reviewStore";
import {
  CreateBookingRequest,
  BookingRequestPayload
} from "../application/usecases/createBookingRequest";
import { useLessonStore } from "../stores/lessonStore";
import { useBookingStore } from "../stores/bookingStore";
import { useMessageStore } from "../stores/messageStore";
import { PublishTutorSchedule } from "../application/usecases/publishTutorSchedule";

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
  reviewRepository: ReviewRepository;
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
  notification?: NotificationService;
  t?: (key: string) => string;
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
  reviewRepository,
  acceptBooking,
  sendMessage,
  sendMessageWithFiles,
  blossomUrl,
  setDiscoverStatus,
  setMessageStatus,
  onLogout,
  notification,
  t,
}: UseAppActionsProps) {
  const { t: defaultT } = useI18n();
  const translate = t ?? defaultT;

  const changeLessonStatusUseCase = new ChangeLessonStatus(
    lessonRepository,
    bookingRepository,
    (lessonId, status) => {
      useLessonStore.getState().optimisticStatusUpdate(lessonId, status);
    },
    (lessonId, snapshot) => {
      if (snapshot) useLessonStore.getState().optimisticStatusUpdate(lessonId, snapshot.status);
    },
  );

  const cancelBookingUseCase = new CancelBooking(
    bookingRepository,
    (bookingId, status) => {
      useBookingStore.getState().optimisticSetStatus(bookingId, status as "accepted" | "rejected" | "completed" | "cancelled");
    },
    (bookingId) => {
      const snapshot = useBookingStore.getState().snapshotStatus(bookingId);
      useBookingStore.getState().restoreStatus(bookingId, snapshot);
    },
  );

  const createBookingRequestUseCase = new CreateBookingRequest(
    publishBookingRequest,
  );
  const publishReviewUseCase = new PublishReview(
    reviewRepository,
    (review) => {
      useReviewStore.getState().addReview(review.subjectPubkey, review);
    },
    (reviewId) => {
      const state = useReviewStore.getState();
      for (const [subject, reviews] of Object.entries(state.bySubject)) {
        const found = reviews.find((r) => r.id === reviewId);
        if (found) {
          state.removeReview(subject, reviewId);
          break;
        }
      }
    },
  );

  async function respondToBooking(request: Booking, nextStatus: "accepted" | "rejected") {
    if (nextStatus !== "accepted") {
      const snapshot = useBookingStore.getState().snapshotStatus(request.id);
      useBookingStore.getState().optimisticSetStatus(request.id, nextStatus);
      try {
        await bookingRepository.updateStatus(request.id, nextStatus);
      } catch (error) {
        useBookingStore.getState().restoreStatus(request.id, snapshot);
        throw error;
      }
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

    if (nextStatus === "completed") {
      notification?.success(translate("common.notifications.lessonCompleted"));
    } else if (nextStatus === "canceled") {
      notification?.info(translate("common.notifications.lessonCancelled"));
    }
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
      setDiscoverStatus(translate("discover.activeRequestHint"));
      return;
    }

    if (winner && winner.studentId !== studentPubkey) {
      setDiscoverStatus(translate("discover.unavailable"));
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
      setDiscoverStatus(translate("discover.sendRequest"));
    } catch (error) {
      setDiscoverStatus(
        toLocalizedErrorMessage(error, translate) || translate("discover.sendRequest")
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

    const key = threadKey ?? [studentPubkey, recipientPubkey].sort().join(":");
    const optimisticMsg = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: studentPubkey,
      kind: 4,
      tags: [["p", recipientPubkey]],
      content: text,
    };
    const snapshot = useMessageStore.getState().snapshotThread(key);
    useMessageStore.getState().optimisticAddMessage(key, optimisticMsg);

    try {
      await sendMessage(recipientPubkey, text, threadKey);
    } catch (error) {
      useMessageStore.getState().restoreThread(key, snapshot);
      setMessageStatus(
        toLocalizedErrorMessage(error, translate) || translate("common.buttons.sendMessage")
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

    const key = threadKey ?? [studentPubkey, recipientPubkey].sort().join(":");
    const optimisticMsg = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: studentPubkey,
      kind: 4,
      tags: [["p", recipientPubkey]],
      content: text,
    };
    const snapshot = useMessageStore.getState().snapshotThread(key);
    useMessageStore.getState().optimisticAddMessage(key, optimisticMsg);

    try {
      await sendMessageWithFiles(recipientPubkey, text, files, blossomUrl, threadKey);
      setMessageStatus(translate("common.messages.attachmentsSent"));
    } catch (error) {
      useMessageStore.getState().restoreThread(key, snapshot);
      setMessageStatus(
        toLocalizedErrorMessage(error, translate) || translate("common.messages.uploadFailed")
      );
      throw error;
    }
  }

  async function publishReview(
    lessonAgreementEvent: LessonAgreementEvent,
    viewerPubkey: string,
    rating: ReviewRating,
    comment: string
  ) {
    const result = await publishReviewUseCase.execute(
      lessonAgreementEvent,
      viewerPubkey,
      viewerRole,
      { rating, comment }
    );

    if (!result.ok) {
      throw new Error(result.error.type);
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
    publishReview,
    logout
  };
}
