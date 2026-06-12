import { LessonAgreementEventsRepository } from "../../ports/lessonAgreementEventsRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";
import { LessonAgreement, LessonAgreementStatus } from "../../domain/lesson";
import { LessonAgreementEvent } from "../../ports/lessonAgreementEventsRepository";
import { getTagValue, getTagValues } from "../../utils/nostrTags";

export function toLessonAgreementEvent(
  eventPubkey: string,
  eventId: string,
  createdAt: number,
  tags: string[][],
  parsed: LessonAgreement,
): LessonAgreementEvent {
  const lessonId = parsed.lessonId || getTagValue(tags, "d") || eventId;
  const participants = getTagValues(tags, "p");
  const tutorPubkey = participants[0] || eventPubkey;
  const studentPubkey =
    participants.find((participant) => participant !== tutorPubkey) || "";

  return {
    id: eventId,
    created_at: createdAt,
    pubkey: eventPubkey,
    lessonId,
    tutorPubkey,
    studentPubkey,
    bookingEventId: getTagValue(tags, "e"),
    agreement: {
      ...parsed,
      lessonId,
    },
  };
}

async function publishLessonAgreement(
  currentPubkey: string,
  tutorPubkey: string,
  studentPubkey: string,
  payload: LessonAgreement & { bookingEventId: string },
) {
  const tags: string[][] = [
    ["d", payload.lessonId],
    ["p", tutorPubkey],
    ["p", studentPubkey],
    ["t", "lesson:agreement"],
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
    status: payload.status,
  };

  await nostrClient.publishReplaceableEvent(
    TutorHubKind.LessonAgreement,
    JSON.stringify(content),
    tags,
  );
}

export function createNostrLessonAgreementEventsRepository(): LessonAgreementEventsRepository {
  return {
    subscribeForUser(pubkey, onAgreement) {
      return addKindListener(TutorHubKind.LessonAgreement, (event) => {
        const participants = getTagValues(event.tags, "p");
        const isParticipant = participants.includes(pubkey);
        const isAuthor = event.pubkey === pubkey;

        if (!isParticipant && !isAuthor) return;

        try {
          const parsed = JSON.parse(event.content) as LessonAgreement;
          onAgreement(
            toLessonAgreementEvent(
              event.pubkey,
              event.id,
              event.created_at,
              event.tags,
              parsed,
            ),
          );
        } catch {
          // ignore malformed payloads
        }
      });
    },

    publishLessonAgreement,

    async updateLessonAgreementStatus(
      currentPubkey,
      tutorPubkey,
      studentPubkey,
      payload,
    ) {
      await publishLessonAgreement(currentPubkey, tutorPubkey, studentPubkey, {
        ...payload,
        status: payload.status as LessonAgreementStatus,
      });
    },
  };
}
