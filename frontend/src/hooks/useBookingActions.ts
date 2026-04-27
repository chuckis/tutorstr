import { useCallback } from "react";
import { makeSlotAllocationKey } from "../domain/slotAllocation";
import { nostrClient } from "../nostr/client";
import {
  BookingRequest,
  BookingStatus,
  LessonAgreement,
  LessonAgreementStatus
} from "../types/nostr";
import { TutorHubKind } from "../nostr/kinds";

function makeBookingId() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return `${Date.now().toString(36)}-${random}`;
}

export function useBookingActions(currentPubkey: string) {
  const publishBookingRequest = useCallback(
    async (tutorPubkey: string, payload: Omit<BookingRequest, "bookingId">) => {
      const bookingId = makeBookingId();
      const slotAllocationKey =
        payload.slotAllocationKey ||
        makeSlotAllocationKey(tutorPubkey, payload.requestedSlot);
      const request: BookingRequest = {
        ...payload,
        bookingId,
        slotAllocationKey
      };
      const tags: string[][] = [
        ["p", tutorPubkey],
        ["t", "booking:request"],
        ["d", bookingId],
        ["slot", slotAllocationKey],
        ["student", currentPubkey]
      ];
      await nostrClient.publishEvent(
        TutorHubKind.BookingRequest,
        JSON.stringify(request),
        tags
      );
      return bookingId;
    },
    [currentPubkey]
  );

  const publishBookingStatus = useCallback(
    async (
      studentPubkey: string,
      payload: Omit<BookingStatus, "bookingId"> & { bookingId: string }
    ) => {
      const status: BookingStatus = {
        bookingId: payload.bookingId,
        status: payload.status,
        note: payload.note,
        reason: payload.reason,
        slotAllocationKey: payload.slotAllocationKey
      };
      const tags: string[][] = [
        ["p", studentPubkey],
        ["t", "booking:status"],
        ["d", payload.bookingId]
      ];
      if (payload.slotAllocationKey) {
        tags.push(["slot", payload.slotAllocationKey]);
      }
      await nostrClient.publishReplaceableEvent(
        TutorHubKind.BookingStatus,
        JSON.stringify(status),
        tags
      );
    },
    []
  );

  const publishLessonAgreement = useCallback(
    async (
      studentPubkey: string,
      payload: LessonAgreement & { bookingEventId: string }
    ) => {
      const tags: string[][] = [
        ["d", payload.lessonId],
        ["p", currentPubkey],
        ["p", studentPubkey],
        ["t", "lesson:agreement"]
      ];
      if (payload.bookingEventId) {
        tags.splice(3, 0, ["e", payload.bookingEventId]);
      }
      const content: LessonAgreement = {
        lessonId: payload.lessonId,
        bookingId: payload.bookingId,
        subject: payload.subject,
        scheduledAt: payload.scheduledAt,
        durationMin: payload.durationMin,
        price: payload.price,
        currency: payload.currency,
        status: payload.status
      };
      await nostrClient.publishReplaceableEvent(
        TutorHubKind.LessonAgreement,
        JSON.stringify(content),
        tags
      );
    },
    [currentPubkey]
  );

  const updateLessonAgreementStatus = useCallback(
    async (
      studentPubkey: string,
      payload: LessonAgreement & {
        bookingEventId: string;
        status: LessonAgreementStatus;
      }
    ) => {
      await publishLessonAgreement(studentPubkey, payload);
    },
    [publishLessonAgreement]
  );

  return {
    publishBookingRequest,
    publishBookingStatus,
    publishLessonAgreement,
    updateLessonAgreementStatus
  };
}
