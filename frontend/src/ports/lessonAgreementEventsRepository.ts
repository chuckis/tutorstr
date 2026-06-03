import { LessonAgreement, LessonAgreementStatus } from "../domain/lesson";

export type LessonAgreementEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  lessonId: string;
  tutorPubkey: string;
  studentPubkey: string;
  bookingEventId?: string;
  agreement: LessonAgreement;
};

export interface LessonAgreementEventsRepository {
  subscribeForUser(
    pubkey: string,
    onAgreement: (agreement: LessonAgreementEvent) => void
  ): () => void;
  publishLessonAgreement(
    currentPubkey: string,
    tutorPubkey: string,
    studentPubkey: string,
    payload: LessonAgreement & { bookingEventId: string }
  ): Promise<void>;
  updateLessonAgreementStatus(
    currentPubkey: string,
    tutorPubkey: string,
    studentPubkey: string,
    payload: LessonAgreement & {
      bookingEventId: string;
      status: LessonAgreementStatus;
    }
  ): Promise<void>;
}
