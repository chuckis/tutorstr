import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import { Lesson, LessonStatus } from "../domain/lesson";
import { BookingRepository } from "../ports/bookingRepository";
import { LessonRepository } from "../ports/lessonRepository";
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
      setDiscoverStatus("You already requested this slot.");
      return;
    }

    if (winner && winner.studentId !== studentPubkey) {
      setDiscoverStatus("Slot is no longer available.");
      return;
    }

    try {
      await publishBookingRequest(tutorPubkey, {
        ...payload,
        slotAllocationKey
      });
      setDiscoverStatus("Slot request sent.");
    } catch (error) {
      setDiscoverStatus(
        error instanceof Error ? error.message : "Failed to send slot request."
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
