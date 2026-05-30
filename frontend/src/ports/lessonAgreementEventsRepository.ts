import { LessonAgreement, LessonAgreementEvent, LessonAgreementStatus } from "../types/nostr";

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
