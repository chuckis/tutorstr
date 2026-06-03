import { useCallback } from "react";
import { useBookingEventsRepository } from "./useBookingEventsRepository";
import { useLessonAgreementEventsRepository } from "./useLessonAgreementEventsRepository";
import { BookingRequest } from "../domain/booking";
import { BookingStatusPayload } from "../ports/bookingEventsRepository";
import { LessonAgreement, LessonAgreementStatus } from "../domain/lesson";

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
      payload: Omit<BookingStatusPayload, "bookingId"> & { bookingId: string }
    ) => {
      await bookingEventsRepository.publishBookingStatus(studentPubkey, payload);
    },
    [bookingEventsRepository]
  );

  const publishLessonAgreement = useCallback(
    async (
      tutorPubkey: string,
      studentPubkey: string,
      payload: LessonAgreement & { bookingEventId: string }
    ) => {
      await lessonAgreementEventsRepository.publishLessonAgreement(
        currentPubkey,
        tutorPubkey,
        studentPubkey,
        payload
      );
    },
    [currentPubkey, lessonAgreementEventsRepository]
  );

  const updateLessonAgreementStatus = useCallback(
    async (
      tutorPubkey: string,
      studentPubkey: string,
      payload: LessonAgreement & {
        bookingEventId: string;
        status: LessonAgreementStatus;
      }
    ) => {
      await lessonAgreementEventsRepository.updateLessonAgreementStatus(
        currentPubkey,
        tutorPubkey,
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
