import { describe, expect, it } from "vitest";
import { Booking } from "../../domain/booking";
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

function buildViewModel({
  requestItems,
  selectedRequest = null,
  requestSegment = "incoming",
  profileNamesByPubkey = {},
  unreadByThread = {}
}: {
  requestItems: Booking[];
  selectedRequest?: SelectedRequest | null;
  requestSegment?: "incoming" | "outgoing";
  profileNamesByPubkey?: Record<string, string | undefined>;
  unreadByThread?: Record<string, number>;
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
    toFallbackDisplayId: (pubkey) => `fallback:${pubkey}`
  });
}

describe("buildRequestsTabViewModel", () => {
  it("groups incoming requests by slot and sorts accepted before pending before resolved", () => {
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
      }
    });

    expect(result.incomingGroups).toHaveLength(1);
    expect(result.incomingGroups[0].requests.map((request) => request.id)).toEqual([
      "accepted",
      "pending",
      "rejected"
    ]);
    expect(result.incomingGroups[0]).toMatchObject({
      candidateCount: 3,
      isAllocated: true,
      pendingCount: 1,
      unreadCount: 3
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
});
