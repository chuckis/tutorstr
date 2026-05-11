import { useCallback } from "react";
import { useBookingEventsRepository } from "./useBookingEventsRepository";
import { useLessonAgreementEventsRepository } from "./useLessonAgreementEventsRepository";
import {
  BookingRequest,
  BookingStatus,
  LessonAgreement,
  LessonAgreementStatus
} from "../types/nostr";

export function useBookingActions(currentPubkey: string) {
  const bookingEventsRepository = useBookingEventsRepository();
  const lessonAgreementEventsRepository = useLessonAgreementEventsRepository();

  const publishBookingRequest = useCallback(
    async (tutorPubkey: string, payload: Omit<BookingRequest, "bookingId">) => {
      return bookingEventsRepository.publishBookingRequest(
        currentPubkey,
        tutorPubkey,
        payload
      );
    },
    [bookingEventsRepository, currentPubkey]
  );

  const publishBookingStatus = useCallback(
    async (
      studentPubkey: string,
      payload: Omit<BookingStatus, "bookingId"> & { bookingId: string }
    ) => {
      await bookingEventsRepository.publishBookingStatus(studentPubkey, payload);
    },
    [bookingEventsRepository]
  );

  const publishLessonAgreement = useCallback(
    async (
      studentPubkey: string,
      payload: LessonAgreement & { bookingEventId: string }
    ) => {
      await lessonAgreementEventsRepository.publishLessonAgreement(
        currentPubkey,
        studentPubkey,
        payload
      );
    },
    [currentPubkey, lessonAgreementEventsRepository]
  );

  const updateLessonAgreementStatus = useCallback(
    async (
      studentPubkey: string,
      payload: LessonAgreement & {
        bookingEventId: string;
        status: LessonAgreementStatus;
      }
    ) => {
      await lessonAgreementEventsRepository.updateLessonAgreementStatus(
        currentPubkey,
        studentPubkey,
        payload
      );
    },
    [currentPubkey, lessonAgreementEventsRepository]
  );

  return {
    publishBookingRequest,
    publishBookingStatus,
    publishLessonAgreement,
    updateLessonAgreementStatus
  };
}
