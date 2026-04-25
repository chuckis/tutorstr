import { useEffect, useMemo, useState } from "react";
import { getSlotEndFromDuration, makeSlotAllocationKey } from "../domain/slotAllocation";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TutorHubKind } from "../nostr/kinds";
import { nostrClient } from "../nostr/client";
import { LessonAgreement, LessonAgreementEvent } from "../types/nostr";
import { getTagValue, getTagValues } from "../utils/nostrTags";

export function usePublicAllocatedSlots() {
  const [agreements, setAgreements] = useState<Record<string, LessonAgreementEvent>>(
    {}
  );

  useEffect(() => {
    const unsubscribe = nostrClient.subscribe(
      { kinds: [TutorHubKind.LessonAgreement], limit: 400 },
      (event) => {
        try {
          const parsed = JSON.parse(event.content) as LessonAgreement;
          const lessonId = parsed.lessonId || getTagValue(event.tags, "d") || event.id;
          const participants = getTagValues(event.tags, "p");
          const tutorPubkey =
            participants.find((participant) => participant === event.pubkey) ||
            event.pubkey;
          const studentPubkey =
            participants.find((participant) => participant !== tutorPubkey) || "";

          setAgreements((prev) => {
            const existing = prev[lessonId];
            if (existing && existing.created_at >= event.created_at) {
              return prev;
            }

            return {
              ...prev,
              [lessonId]: {
                id: event.id,
                created_at: event.created_at,
                pubkey: event.pubkey,
                lessonId,
                tutorPubkey,
                studentPubkey,
                bookingEventId: getTagValue(event.tags, "e"),
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
      }
    );

    return () => unsubscribe();
  }, []);

  const allocatedSlotsByKey = useMemo(() => {
    return Object.values(agreements).reduce<Record<string, SlotOccupancy>>(
      (acc, agreement) => {
        if (agreement.agreement.status === "cancelled") {
          return acc;
        }

        const slotAllocationKey = makeSlotAllocationKey(agreement.tutorPubkey, {
          start: agreement.agreement.scheduledAt,
          end: getSlotEndFromDuration(
            agreement.agreement.scheduledAt,
            agreement.agreement.durationMin
          )
        });
        acc[slotAllocationKey] = {
          studentId: agreement.studentPubkey,
          source: "lesson"
        };

        return acc;
      },
      {}
    );
  }, [agreements]);

  return {
    allocatedSlotsByKey
  };
}
