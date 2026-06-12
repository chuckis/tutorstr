import { BookingEventsRepository } from "../../ports/bookingEventsRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { nostrClient } from "../../nostr/client";
import { BookingRequest } from "../../domain/booking";
import { BookingRequestEvent, BookingStatusPayload, BookingStatusEvent } from "../../ports/bookingEventsRepository";
import { getTagValue } from "../../utils/nostrTags";
import { makeSlotAllocationKey } from "../../domain/slotAllocation";

function makeBookingId() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return `${Date.now().toString(36)}-${random}`;
}

function toBookingRequestEvent(
  pubkey: string,
  fallbackTutorPubkey: string,
  eventId: string,
  createdAt: number,
  tags: string[][],
  parsed: BookingRequest
): BookingRequestEvent {
  const bookingId = parsed.bookingId || getTagValue(tags, "d") || eventId;

  return {
    id: bookingId,
    eventId,
    created_at: createdAt,
    pubkey,
    tutorPubkey: getTagValue(tags, "p") || fallbackTutorPubkey,
    request: {
      ...parsed,
      bookingId
    }
  };
}

function toBookingStatusEvent(
  pubkey: string,
  fallbackStudentPubkey: string,
  eventId: string,
  createdAt: number,
  tags: string[][],
  parsed: BookingStatusPayload
): BookingStatusEvent {
  const bookingId = parsed.bookingId || getTagValue(tags, "d") || eventId;

  return {
    id: bookingId,
    created_at: createdAt,
    pubkey,
    studentPubkey: getTagValue(tags, "p") || fallbackStudentPubkey,
    status: {
      ...parsed,
      bookingId
    }
  };
}

export function createNostrBookingEventsRepository(): BookingEventsRepository {
  return {
    subscribeRequestsForTutor(pubkey, onRequest, since) {
      return nostrClient.subscribe(
        { kinds: [TutorHubKind.BookingRequest], "#p": [pubkey], since, limit: 5 },
        (event) => {
          try {
            const parsed = JSON.parse(event.content) as BookingRequest;
            onRequest(
              toBookingRequestEvent(
                event.pubkey,
                pubkey,
                event.id,
                event.created_at,
                event.tags,
                parsed
              )
            );
          } catch {
            // ignore malformed content
          }
        }
      );
    },

    subscribeRequestsByUser(pubkey, onRequest) {
      return nostrClient.subscribe(
        { kinds: [TutorHubKind.BookingRequest], authors: [pubkey], limit: 200 },
        (event) => {
          try {
            const parsed = JSON.parse(event.content) as BookingRequest;
            onRequest(
              toBookingRequestEvent(
                event.pubkey,
                "",
                event.id,
                event.created_at,
                event.tags,
                parsed
              )
            );
          } catch {
            // ignore malformed content
          }
        }
      );
    },

    subscribeStatusesForUser(pubkey, onStatus, since) {
      const incoming = nostrClient.subscribe(
        { kinds: [TutorHubKind.BookingStatus], "#p": [pubkey], since, limit: 200 },
        (event) => {
          try {
            const parsed = JSON.parse(event.content) as BookingStatusPayload;
            onStatus(
              toBookingStatusEvent(
                event.pubkey,
                pubkey,
                event.id,
                event.created_at,
                event.tags,
                parsed
              )
            );
          } catch {
            // ignore malformed content
          }
        }
      );

      const authored = nostrClient.subscribe(
        { kinds: [TutorHubKind.BookingStatus], authors: [pubkey], since, limit: 200 },
        (event) => {
          try {
            const parsed = JSON.parse(event.content) as BookingStatusPayload;
            onStatus(
              toBookingStatusEvent(
                event.pubkey,
                pubkey,
                event.id,
                event.created_at,
                event.tags,
                parsed
              )
            );
          } catch {
            // ignore malformed content
          }
        }
      );

      return () => {
        incoming();
        authored();
      };
    },

    async publishBookingRequest(currentPubkey, tutorPubkey, payload) {
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

    async publishBookingStatus(studentPubkey, payload) {
      const status: BookingStatusPayload = {

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
    }
  };
}
