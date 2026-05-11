import { describe, expect, it } from "vitest";
import { createAcceptedLessonFactory } from "./createAcceptedLessonFactory";

describe("createAcceptedLessonFactory", () => {
  it("derives duration from the requested slot when the timestamps are valid", () => {
    const createLesson = createAcceptedLessonFactory({
      requestMap: {
        "booking-1": {
          id: "booking-1",
          eventId: "event-1",
          created_at: 1,
          pubkey: "student-1",
          tutorPubkey: "tutor-1",
          request: {
            bookingId: "booking-1",
            requestedSlot: {
              start: "2026-05-09T10:00:00.000Z",
              end: "2026-05-09T11:30:00.000Z"
            },
            message: "",
            studentNpub: "npub-student-1"
          }
        }
      },
      defaults: {
        durationMin: 60,
        subject: "Default subject"
      }
    });

    expect(
      createLesson({
        bookingId: "booking-1",
        tutorId: "tutor-1",
        studentId: "student-1",
        scheduledAt: "2026-05-09T10:00:00.000Z"
      })
    ).toEqual({
      id: "booking-1",
      bookingId: "booking-1",
      tutorId: "tutor-1",
      studentId: "student-1",
      scheduledAt: "2026-05-09T10:00:00.000Z",
      durationMin: 90,
      subject: "Default subject",
      status: "scheduled"
    });
  });

  it("falls back to defaults when the requested slot timestamps are invalid", () => {
    const createLesson = createAcceptedLessonFactory({
      requestMap: {
        "booking-2": {
          id: "booking-2",
          eventId: "event-2",
          created_at: 1,
          pubkey: "student-1",
          tutorPubkey: "tutor-1",
          request: {
            bookingId: "booking-2",
            requestedSlot: {
              start: "invalid",
              end: "also-invalid"
            },
            message: "",
            studentNpub: "npub-student-1"
          }
        }
      },
      defaults: {
        durationMin: 45,
        subject: "Fallback subject"
      }
    });

    expect(
      createLesson({
        bookingId: "booking-2",
        tutorId: "tutor-1",
        studentId: "student-1",
        scheduledAt: "2026-05-09T10:00:00.000Z"
      })
    ).toMatchObject({
      durationMin: 45,
      subject: "Fallback subject",
      status: "scheduled"
    });
  });

  it("enforces a 15-minute minimum duration for short slots", () => {
    const createLesson = createAcceptedLessonFactory({
      requestMap: {
        "booking-3": {
          id: "booking-3",
          eventId: "event-3",
          created_at: 1,
          pubkey: "student-1",
          tutorPubkey: "tutor-1",
          request: {
            bookingId: "booking-3",
            requestedSlot: {
              start: "2026-05-09T10:00:00.000Z",
              end: "2026-05-09T10:05:00.000Z"
            },
            message: "",
            studentNpub: "npub-student-1"
          }
        }
      }
    });

    expect(
      createLesson({
        bookingId: "booking-3",
        tutorId: "tutor-1",
        studentId: "student-1",
        scheduledAt: "2026-05-09T10:00:00.000Z"
      }).durationMin
    ).toBe(15);
  });
});
