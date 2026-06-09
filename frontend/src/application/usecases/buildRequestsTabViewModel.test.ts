import { describe, expect, it } from "vitest";
import { Booking, BookingStatus } from "../../domain/booking";
import { BookingStatusEvent } from "../../ports/bookingEventsRepository";
import { buildRequestsTabViewModel, SelectedRequest } from "./buildRequestsTabViewModel";

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

function makeStatusEvent(
  bookingId: string,
  status: string,
  created_at: number
): BookingStatusEvent {
  return {
    id: `status-${bookingId}`,
    created_at,
    pubkey: "tutor-1",
    studentPubkey: "student-1",
    status: {
      bookingId,
      status: status as "accepted" | "rejected" | "completed" | "cancelled",
      slotAllocationKey: "slot-1"
    }
  };
}

function buildViewModel({
  requestItems,
  selectedRequest = null,
  requestSegment = "incoming",
  profileNamesByPubkey = {},
  unreadByThread = {},
  statusEvents = {},
  currentTimeSeconds
}: {
  requestItems: Booking[];
  selectedRequest?: SelectedRequest | null;
  requestSegment?: "incoming" | "outgoing";
  profileNamesByPubkey?: Record<string, string | undefined>;
  unreadByThread?: Record<string, number>;
  statusEvents?: Record<string, BookingStatusEvent>;
  currentTimeSeconds?: number;
}) {
  return buildRequestsTabViewModel({
    requestItems,
    requestSegment,
    selectedRequest,
    profileNamesByPubkey,
    getUnreadCount: (threadKey) => unreadByThread[threadKey] || 0,
    getUnreadTotal: (threadKeys) =>
      Array.from(new Set(threadKeys)).reduce(
        (total, threadKey) => total + (unreadByThread[threadKey] || 0),
        0
      ),
    toFallbackDisplayId: (pubkey) => `fallback:${pubkey}`,
    requestTimestamps: {},
    statusEvents,
    counterpartyProfiles: {},
    viewerRole: "tutor",
    currentTimeSeconds
  });
}

describe("buildRequestsTabViewModel", () => {
  it("groups incoming requests by slot and sorts pending before resolved", () => {
    const now = 1_700_000_000;
    const rejected = makeBooking({
      id: "rejected",
      status: "rejected",
      studentId: "student-rejected"
    });
    const pending = makeBooking({
      id: "pending",
      status: "pending",
      studentId: "student-pending"
    });
    const accepted = makeBooking({
      id: "accepted",
      status: "accepted",
      studentId: "student-accepted"
    });

    const result = buildViewModel({
      requestItems: [rejected, pending, accepted],
      unreadByThread: {
        "request:accepted": 1,
        "request:pending": 2
      },
      statusEvents: {
        "rejected": makeStatusEvent("rejected", "rejected", now - 3600)
      },
      currentTimeSeconds: now
    });

    expect(result.incomingGroups).toHaveLength(1);
    expect(result.incomingGroups[0].requests.map((request) => request.id)).toEqual([
      "pending",
      "rejected"
    ]);
    expect(result.incomingGroups[0]).toMatchObject({
      candidateCount: 2,
      isAllocated: false,
      pendingCount: 1,
      unreadCount: 2
    });
  });

  it("maps status, reason, action flags, and counterparty labels for incoming cards", () => {
    const request = makeBooking({
      id: "booking-incoming",
      studentId: "student-known",
      resolutionReason: "duplicate_bid"
    });

    const result = buildViewModel({
      requestItems: [request],
      profileNamesByPubkey: {
        "student-known": "Ada Student"
      }
    });

    const item = result.incomingGroups[0].requests[0];
    expect(item).toMatchObject({
      id: "booking-incoming",
      segment: "incoming",
      statusLabel: "pending",
      reasonLabel: "duplicate_bid",
      counterpartyLabel: "Ada Student",
      threadKey: "request:booking-incoming",
      canAccept: true,
      canDecline: true,
      canCancel: false
    });
  });

  it("builds outgoing cards with cancel-only pending actions and fallback names", () => {
    const request = makeBooking({
      id: "booking-outgoing",
      tutorId: "tutor-unknown"
    });

    const result = buildViewModel({
      requestItems: [request],
      requestSegment: "outgoing",
      unreadByThread: {
        "request:booking-outgoing": 4
      }
    });

    expect(result.outgoingRequests[0]).toMatchObject({
      id: "booking-outgoing",
      segment: "outgoing",
      counterpartyLabel: "fallback:tutor-unknown",
      unreadCount: 4,
      canAccept: false,
      canDecline: false,
      canCancel: true
    });
  });

  it("builds selected request details with recipient pubkey and accepted reason label", () => {
    const request = makeBooking({
      id: "accepted-request",
      status: "accepted",
      studentId: "student-1"
    });

    const result = buildViewModel({
      requestItems: [],
      selectedRequest: {
        request,
        segment: "incoming"
      },
      profileNamesByPubkey: {
        "student-1": "Grace Student"
      }
    });

    expect(result.selectedRequest).toMatchObject({
      id: "accepted-request",
      statusLabel: "accepted",
      reasonLabel: "accepted",
      counterpartyLabel: "Grace Student",
      threadKey: "request:accepted-request",
      recipientPubkey: "student-1",
      canAccept: false,
      canDecline: false,
      canCancel: false
    });
  });

  it("filters out accepted requests from incoming groups", () => {
    const accepted = makeBooking({
      id: "accepted-1",
      status: "accepted",
      studentId: "student-1"
    });
    const pending = makeBooking({
      id: "pending-1",
      status: "pending",
      studentId: "student-2"
    });

    const result = buildViewModel({
      requestItems: [accepted, pending]
    });

    expect(result.incomingGroups).toHaveLength(1);
    expect(result.incomingGroups[0].requests.map((r) => r.id)).toEqual(["pending-1"]);
    expect(result.isEmpty).toBe(false);
  });

  it("filters out accepted requests from outgoing list", () => {
    const accepted = makeBooking({
      id: "accepted-1",
      status: "accepted",
      tutorId: "tutor-1"
    });
    const pending = makeBooking({
      id: "pending-1",
      status: "pending",
      tutorId: "tutor-2"
    });

    const result = buildViewModel({
      requestItems: [accepted, pending],
      requestSegment: "outgoing"
    });

    expect(result.outgoingRequests).toHaveLength(1);
    expect(result.outgoingRequests[0].id).toBe("pending-1");
  });

  it("keeps recently rejected requests visible", () => {
    const now = 1_700_000_000;
    const rejected = makeBooking({
      id: "rejected-1",
      status: "rejected",
      studentId: "student-1"
    });

    const result = buildViewModel({
      requestItems: [rejected],
      statusEvents: {
        "rejected-1": makeStatusEvent("rejected-1", "rejected", now - 3600)
      },
      currentTimeSeconds: now
    });

    expect(result.incomingGroups).toHaveLength(1);
    expect(result.incomingGroups[0].requests.map((r) => r.id)).toEqual(["rejected-1"]);
  });

  it("hides rejected requests older than 24 hours", () => {
    const now = 1_700_000_000;
    const rejected = makeBooking({
      id: "rejected-1",
      status: "rejected",
      studentId: "student-1"
    });

    const result = buildViewModel({
      requestItems: [rejected],
      statusEvents: {
        "rejected-1": makeStatusEvent("rejected-1", "rejected", now - 86401)
      },
      currentTimeSeconds: now
    });

    expect(result.incomingGroups).toHaveLength(0);
    expect(result.isEmpty).toBe(true);
  });

  it("hides rejected requests without a status event", () => {
    const rejected = makeBooking({
      id: "rejected-1",
      status: "rejected",
      studentId: "student-1"
    });

    const result = buildViewModel({
      requestItems: [rejected]
    });

    expect(result.incomingGroups).toHaveLength(0);
    expect(result.isEmpty).toBe(true);
  });

  it("does not filter out cancelled requests", () => {
    const cancelled = makeBooking({
      id: "cancelled-1",
      status: "cancelled",
      studentId: "student-1"
    });

    const result = buildViewModel({
      requestItems: [cancelled]
    });

    expect(result.incomingGroups).toHaveLength(1);
    expect(result.incomingGroups[0].requests.map((r) => r.id)).toEqual(["cancelled-1"]);
  });
});
