import { useEffect, useMemo, useState } from "react";
import { TutorHubKind } from "../nostr/kinds";
import { nostrClient } from "../nostr/client";
import { LessonAgreement, LessonAgreementEvent } from "../types/nostr";
import { getTagValue, getTagValues } from "../utils/nostrTags";

export function useLessonAgreementsForUser(pubkey: string) {
  const [agreements, setAgreements] = useState<
    Record<string, LessonAgreementEvent>
  >({});

  useEffect(() => {
    const upsert = (
      eventPubkey: string,
      eventId: string,
      createdAt: number,
      tags: string[][],
      content: string
    ) => {
      try {
        const parsed = JSON.parse(content) as LessonAgreement;
        const lessonId = parsed.lessonId || getTagValue(tags, "d") || eventId;
        const participants = getTagValues(tags, "p");
        const tutorPubkey =
          participants.find((participant) => participant === eventPubkey) ||
          eventPubkey;
        const studentPubkey =
          participants.find((participant) => participant !== tutorPubkey) || "";

        setAgreements((prev) => {
          const existing = prev[lessonId];
          if (existing && existing.created_at >= createdAt) {
            return prev;
          }
          return {
            ...prev,
            [lessonId]: {
              id: eventId,
              created_at: createdAt,
              pubkey: eventPubkey,
              lessonId,
              tutorPubkey,
              studentPubkey,
              bookingEventId: getTagValue(tags, "e"),
              agreement: {
                ...parsed,
                lessonId
              }
            }
          };
        });
      } catch {
        // ignore malformed payloads
      }
    };

    const incoming = nostrClient.subscribe(
      { kinds: [TutorHubKind.LessonAgreement], "#p": [pubkey], limit: 200 },
      (event) =>
        upsert(event.pubkey, event.id, event.created_at, event.tags, event.content)
    );

    const own = nostrClient.subscribe(
      { kinds: [TutorHubKind.LessonAgreement], authors: [pubkey], limit: 200 },
      (event) =>
        upsert(event.pubkey, event.id, event.created_at, event.tags, event.content)
    );

    return () => {
      incoming();
      own();
    };
  }, [pubkey]);

  const list = useMemo(
    () =>
      Object.values(agreements).sort((a, b) => {
        const left = Date.parse(a.agreement.scheduledAt);
        const right = Date.parse(b.agreement.scheduledAt);
        return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
      }),
    [agreements]
  );

  return { agreements, list };
}
