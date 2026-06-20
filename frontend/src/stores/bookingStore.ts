import { create } from "zustand";
import type { NostrEvent } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import {
  BookingRequestEvent,
  BookingStatusEvent,
  BookingStatusPayload,
  BookingRequest,
} from "../ports/bookingEventsRepository";
import { getTagValue } from "../utils/nostrTags";

function makeBookingId() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return `${Date.now().toString(36)}-${random}`;
}

function toBookingRequestEvent(
  pubkey: string,
  eventId: string,
  createdAt: number,
  tags: string[][],
  parsed: BookingRequest,
): BookingRequestEvent {
  const bookingId = parsed.bookingId || getTagValue(tags, "d") || eventId;
  return {
    id: bookingId,
    eventId,
    created_at: createdAt,
    pubkey,
    tutorPubkey: getTagValue(tags, "p") || "",
    request: { ...parsed, bookingId },
  };
}

function toBookingStatusEvent(
  pubkey: string,
  eventId: string,
  createdAt: number,
  tags: string[][],
  parsed: BookingStatusPayload,
): BookingStatusEvent {
  const bookingId = parsed.bookingId || getTagValue(tags, "d") || eventId;
  return {
    id: bookingId,
    created_at: createdAt,
    pubkey,
    studentPubkey: getTagValue(tags, "p") || "",
    status: { ...parsed, bookingId },
  };
}

interface BookingState {
  requests: Record<string, BookingRequestEvent>;
  statuses: Record<string, BookingStatusEvent>;
  hydrated: boolean;
  ingest: (event: NostrEvent) => void;
  setHydrated: (v: boolean) => void;
  /** Optimistic: set a booking's status without waiting for relay echo. */
  optimisticSetStatus: (bookingId: string, newStatus: BookingStatusPayload["status"]) => void;
  /** Optimistic: add a request event (for createBookingRequest). */
  optimisticAddRequest: (request: BookingRequestEvent) => void;
  /** Remove a request (for rollback after optimisticAddRequest). */
  removeRequest: (bookingId: string) => void;
  /** Snapshot current status for a booking (for rollback). */
  snapshotStatus: (bookingId: string) => BookingStatusEvent | undefined;
  /** Restore a status from snapshot. */
  restoreStatus: (bookingId: string, snapshot: BookingStatusEvent | undefined) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  requests: {},
  statuses: {},
  hydrated: false,

  ingest(event) {
    if (event.kind === TutorHubKind.BookingRequest) {
      try {
        const parsed = JSON.parse(event.content) as BookingRequest;
        const request = toBookingRequestEvent(
          event.pubkey,
          event.id,
          event.created_at,
          event.tags,
          parsed,
        );
        set((s) => {
          const existing = s.requests[request.id];
          if (existing && existing.created_at >= request.created_at) return s;
          return { requests: { ...s.requests, [request.id]: request } };
        });
      } catch {
        // ignore malformed content
      }
      return;
    }

    if (event.kind === TutorHubKind.BookingStatus) {
      try {
        const parsed = JSON.parse(event.content) as BookingStatusPayload;
        const status = toBookingStatusEvent(
          event.pubkey,
          event.id,
          event.created_at,
          event.tags,
          parsed,
        );
        set((s) => {
          const existing = s.statuses[status.id];
          if (existing && existing.created_at >= status.created_at) return s;
          return { statuses: { ...s.statuses, [status.id]: status } };
        });
      } catch {
        // ignore malformed content
      }
    }
  },

  setHydrated(v) {
    set({ hydrated: v });
  },

  optimisticSetStatus(bookingId, newStatus) {
    set((s) => {
      const existing = s.statuses[bookingId];
      if (!existing) return s;
      return {
        statuses: {
          ...s.statuses,
          [bookingId]: {
            ...existing,
            status: { ...existing.status, status: newStatus as "accepted" | "rejected" | "completed" | "cancelled" },
          },
        },
      };
    });
  },

  optimisticAddRequest(request) {
    set((s) => {
      if (s.requests[request.id]) return s;
      return { requests: { ...s.requests, [request.id]: request } };
    });
  },

  removeRequest(bookingId) {
    set((s) => {
      const next = { ...s.requests };
      delete next[bookingId];
      return { requests: next };
    });
  },

  snapshotStatus(bookingId) {
    return get().statuses[bookingId];
  },

  restoreStatus(bookingId, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.statuses };
        delete next[bookingId];
        return { statuses: next };
      });
      return;
    }
    set((s) => ({
      statuses: { ...s.statuses, [bookingId]: snapshot },
    }));
  },
}));
