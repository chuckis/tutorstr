import { create } from "zustand";
import type { NostrEvent } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import { LessonAgreementEvent } from "../ports/lessonAgreementEventsRepository";
import { LessonAgreement, LessonStatus } from "../domain/lesson";
import { getTagValue, getTagValues } from "../utils/nostrTags";

interface LessonState {
  byId: Record<string, LessonAgreementEvent>;
  hydrated: boolean;
  ingest: (event: NostrEvent) => void;
  setHydrated: (v: boolean) => void;
  /** Optimistically update a lesson's status without waiting for relay echo. */
  optimisticStatusUpdate: (lessonId: string, status: LessonStatus) => void;
  /** Optimistically add a lesson agreement (for acceptBooking). */
  optimisticAddLesson: (lesson: LessonAgreementEvent) => void;
  /** Snapshot a lesson for rollback. */
  snapshotLesson: (lessonId: string) => LessonAgreementEvent | undefined;
  /** Restore a lesson from snapshot. */
  restoreLesson: (lessonId: string, snapshot: LessonAgreementEvent | undefined) => void;
}

function toLessonAgreementStatus(status: LessonStatus): LessonAgreement["status"] {
  if (status === "canceled") return "cancelled";
  return status as LessonAgreement["status"];
}

export const useLessonStore = create<LessonState>((set, get) => ({
  byId: {},
  hydrated: false,

  ingest(event) {
    if (event.kind !== TutorHubKind.LessonAgreement) return;
    try {
      const parsed = JSON.parse(event.content) as LessonAgreement;
      const lessonId = parsed.lessonId || getTagValue(event.tags, "d") || event.id;
      const participants = getTagValues(event.tags, "p");
      const tutorPubkey = participants[0] || event.pubkey;
      const studentPubkey =
        participants.find((p) => p !== tutorPubkey) || "";

      set((s) => {
        const existing = s.byId[lessonId];
        if (existing && existing.created_at >= event.created_at) return s;
        return {
          byId: {
            ...s.byId,
            [lessonId]: {
              id: event.id,
              created_at: event.created_at,
              pubkey: event.pubkey,
              lessonId,
              tutorPubkey,
              studentPubkey,
              bookingEventId: getTagValue(event.tags, "e"),
              agreement: { ...parsed, lessonId },
            },
          },
        };
      });
    } catch {
      // ignore malformed content
    }
  },

  setHydrated(v) {
    set({ hydrated: v });
  },

  optimisticStatusUpdate(lessonId, status) {
    set((s) => {
      const entry = s.byId[lessonId];
      if (!entry) return s;
      return {
        byId: {
          ...s.byId,
          [lessonId]: {
            ...entry,
            agreement: {
              ...entry.agreement,
              status: toLessonAgreementStatus(status),
            },
          },
        },
      };
    });
  },

  optimisticAddLesson(lesson) {
    set((s) => {
      if (s.byId[lesson.lessonId]) return s;
      return { byId: { ...s.byId, [lesson.lessonId]: lesson } };
    });
  },

  snapshotLesson(lessonId) {
    return get().byId[lessonId];
  },

  restoreLesson(lessonId, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.byId };
        delete next[lessonId];
        return { byId: next };
      });
      return;
    }
    set((s) => ({
      byId: { ...s.byId, [lessonId]: snapshot },
    }));
  },
}));
