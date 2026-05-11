import { describe, expect, it } from "vitest";
import { Booking } from "./booking";
import {
  buildRequestsByAllocationKey,
  selectActiveBidBySlotAndStudent,
  selectWinningOccupancyByAllocationKey
} from "./bookingSelectors";

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    tutorId: "tutor-1",
    studentId: "student-1",
    scheduledAt: "2026-05-09T10:00:00.000Z",
    scheduledEnd: "2026-05-09T11:00:00.000Z",
    status: "pending",
    slotAllocationKey: "slot-1",
    ...overrides
  };
}

describe("bookingSelectors", () => {
  it("sorts requests by newest timestamp first", () => {
    const oldest = makeBooking({ id: "oldest" });
    const newest = makeBooking({ id: "newest" });

    const result = buildRequestsByAllocationKey(
      [oldest, newest],
      { newest: { created_at: 20 }, oldest: { created_at: 10 } },
      {}
    );

    expect(result["slot-1"].map((booking) => booking.id)).toEqual([
      "newest",
      "oldest"
    ]);
  });

  it("keeps the latest accepted booking as the slot winner", () => {
    const firstAccepted = makeBooking({
      id: "accepted-1",
      studentId: "student-1",
      status: "accepted"
    });
    const laterAccepted = makeBooking({
      id: "accepted-2",
      studentId: "student-2",
      status: "accepted"
    });

    const result = selectWinningOccupancyByAllocationKey(
      [firstAccepted, laterAccepted],
      { "accepted-1": { created_at: 10 }, "accepted-2": { created_at: 20 } },
      {}
    );

    expect(result).toEqual({
      "slot-1": {
        studentId: "student-2",
        source: "booking"
      }
    });
  });

  it("keeps the latest active booking per slot and student", () => {
    const firstPending = makeBooking({ id: "pending-1", status: "pending" });
    const laterActive = makeBooking({ id: "accepted-1", status: "accepted" });
    const rejected = makeBooking({ id: "rejected-1", status: "rejected" });

    const result = selectActiveBidBySlotAndStudent(
      [firstPending, laterActive, rejected],
      {
        "pending-1": { created_at: 10 },
        "accepted-1": { created_at: 20 },
        "rejected-1": { created_at: 30 }
      },
      {}
    );

    expect(Object.keys(result)).toHaveLength(1);
    expect(
      result["tutor-1|2026-05-09T10:00:00.000Z|2026-05-09T11:00:00.000Z|student-1"]?.id
    ).toBe("accepted-1");
  });
});
