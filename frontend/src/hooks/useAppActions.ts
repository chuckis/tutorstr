import { Booking } from "../domain/booking";
import { Lesson, LessonStatus } from "../domain/lesson";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
import { nostrClient } from "../nostr/client";
import { ScheduleSlot } from "../types/nostr";

type AcceptBookingUseCase = {
  execute: (bookingId: string) => Promise<void>;
};

type UseAppActionsProps = {
  studentNpub: string;
  relayInput: string;
  publishBookingRequest: (
    tutorPubkey: string,
    payload: {
      requestedSlot: ScheduleSlot;
      message: string;
      studentNpub: string;
    }
  ) => Promise<unknown>;
  bookingRepository: BookingRepository;
  lessonRepository: LessonRepository;
  acceptBooking: AcceptBookingUseCase;
  sendMessage: (recipientPubkey: string, text: string) => Promise<void>;
  setDiscoverStatus: (value: string) => void;
  setMessageStatus: (value: string) => void;
  setRelayStatus: (value: string) => void;
};

function parseRelayList(value: string) {
  return value
    .split(",")
    .map((relay) => relay.trim())
    .filter(Boolean);
}

export function useAppActions({
  studentNpub,
  relayInput,
  publishBookingRequest,
  bookingRepository,
  lessonRepository,
  acceptBooking,
  sendMessage,
  setDiscoverStatus,
  setMessageStatus,
  setRelayStatus
}: UseAppActionsProps) {
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

  async function requestPublishedSlot(tutorPubkey: string, slot: ScheduleSlot) {
    setDiscoverStatus("");

    try {
      await publishBookingRequest(tutorPubkey, {
        requestedSlot: slot,
        message: "",
        studentNpub
      });
      setDiscoverStatus("Slot request sent.");
    } catch (error) {
      setDiscoverStatus(
        error instanceof Error ? error.message : "Failed to send slot request."
      );
    }
  }

  async function sendEncryptedMessage(recipientPubkey: string, text: string) {
    setMessageStatus("");

    try {
      await sendMessage(recipientPubkey, text);
    } catch (error) {
      setMessageStatus(
        error instanceof Error ? error.message : "Failed to send message."
      );
    }
  }

  function updateRelays() {
    const parsed = parseRelayList(relayInput);
    if (parsed.length === 0) {
      setRelayStatus("Add at least one relay URL.");
      return;
    }

    nostrClient.setRelays(parsed);
    setRelayStatus("Relays updated.");
  }

  function logout() {
    nostrClient.clearStoredKeypair();
    window.location.reload();
  }

  return {
    respondToBooking,
    changeLessonStatus,
    cancelRequestFromStudent,
    requestPublishedSlot,
    sendEncryptedMessage,
    updateRelays,
    logout
  };
}
