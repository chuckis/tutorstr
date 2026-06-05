import { Booking, BookingResolutionReason } from "../../domain/booking";
import { requestMessageThreadKey } from "../../domain/messageThread";
import { BookingStatusEvent } from "../../ports/bookingEventsRepository";
import { UserProfileEvent } from "../../ports/eventTypes";
import { AccountRole } from "../../domain/account";

export type RequestSegment = "incoming" | "outgoing";

export type SelectedRequest = {
  request: Booking;
  segment: RequestSegment;
};

export type RequestReasonLabel = BookingResolutionReason | "accepted";

export type StatusHistoryEntry = {
  status: "pending" | "accepted" | "rejected" | "cancelled";
  reason?: BookingResolutionReason;
  timestamp: number;
};

export type RequestListItemViewModel = {
  request: Booking;
  id: string;
  segment: RequestSegment;
  statusLabel: string;
  reasonLabel: RequestReasonLabel | null;
  counterpartyLabel: string;
  threadKey: string;
  unreadCount: number;
  canAccept: boolean;
  canDecline: boolean;
  canCancel: boolean;
};

export type IncomingRequestGroupViewModel = {
  slotAllocationKey: string;
  scheduledAt: string;
  scheduledEnd?: string;
  candidateCount: number;
  isAllocated: boolean;
  pendingCount: number;
  unreadCount: number;
  requests: RequestListItemViewModel[];
};

export type SelectedRequestViewModel = RequestListItemViewModel & {
  recipientPubkey: string;
  counterpartyProfile?: UserProfileEvent;
  statusHistory: StatusHistoryEntry[];
  viewerRole: AccountRole;
};

export type RequestsTabViewModel = {
  selectedRequest: SelectedRequestViewModel | null;
  incomingGroups: IncomingRequestGroupViewModel[];
  outgoingRequests: RequestListItemViewModel[];
  isEmpty: boolean;
};

type BuildRequestsTabViewModelParams = {
  requestItems: Booking[];
  requestSegment: RequestSegment;
  selectedRequest: SelectedRequest | null;
  profileNamesByPubkey: Record<string, string | undefined>;
  getUnreadCount: (threadKey: string) => number;
  getUnreadTotal: (threadKeys: string[]) => number;
  toFallbackDisplayId: (pubkey: string) => string;
  requestTimestamps: Record<string, number>;
  statusEvents: Record<string, BookingStatusEvent>;
  counterpartyProfiles: Record<string, UserProfileEvent>;
  viewerRole: AccountRole;
};

function requestStatusLabel(status: Booking["status"]) {
  return status === "rejected" ? "declined" : status;
}

function requestReasonLabel(request: Booking): RequestReasonLabel | null {
  if (request.resolutionReason) {
    return request.resolutionReason;
  }

  if (request.status === "accepted") {
    return "accepted";
  }

  return null;
}

function requestPriority(request: Booking) {
  if (request.status === "accepted") {
    return 0;
  }

  if (request.status === "pending") {
    return 1;
  }

  return 2;
}

function sortIncomingGroup(group: Booking[]) {
  return [...group].sort((left, right) => {
    const leftScore = requestPriority(left);
    const rightScore = requestPriority(right);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt);
  });
}

function groupIncomingRequests(requestItems: Booking[]) {
  const grouped = requestItems.reduce<Record<string, Booking[]>>((acc, request) => {
    const existing = acc[request.slotAllocationKey] || [];
    existing.push(request);
    acc[request.slotAllocationKey] = existing;
    return acc;
  }, {});

  return Object.values(grouped)
    .map(sortIncomingGroup)
    .sort((a, b) => Date.parse(a[0].scheduledAt) - Date.parse(b[0].scheduledAt));
}

function getCounterpartyPubkey(request: Booking, segment: RequestSegment) {
  return segment === "incoming" ? request.studentId : request.tutorId;
}

function buildStatusHistory(
  request: Booking,
  requestTimestamps: Record<string, number>,
  statusEvents: Record<string, BookingStatusEvent>
): StatusHistoryEntry[] {
  const history: StatusHistoryEntry[] = [];

  const requestCreatedAt = requestTimestamps[request.id];
  if (requestCreatedAt) {
    history.push({
      status: "pending",
      timestamp: requestCreatedAt
    });
  }

  const statusEvent = statusEvents[request.id];
  if (statusEvent && request.status !== "pending") {
    history.push({
      status: request.status,
      reason: request.resolutionReason,
      timestamp: statusEvent.created_at
    });
  }

  return history;
}

function buildRequestListItem({
  request,
  segment,
  profileNamesByPubkey,
  getUnreadCount,
  toFallbackDisplayId
}: {
  request: Booking;
  segment: RequestSegment;
  profileNamesByPubkey: Record<string, string | undefined>;
  getUnreadCount: (threadKey: string) => number;
  toFallbackDisplayId: (pubkey: string) => string;
}): RequestListItemViewModel {
  const threadKey = requestMessageThreadKey(request);
  const counterpartyPubkey = getCounterpartyPubkey(request, segment);
  const isPending = request.status === "pending";

  return {
    request,
    id: request.id,
    segment,
    statusLabel: requestStatusLabel(request.status),
    reasonLabel: requestReasonLabel(request),
    counterpartyLabel:
      profileNamesByPubkey[counterpartyPubkey] || toFallbackDisplayId(counterpartyPubkey),
    threadKey,
    unreadCount: getUnreadCount(threadKey),
    canAccept: segment === "incoming" && isPending,
    canDecline: segment === "incoming" && isPending,
    canCancel: segment === "outgoing" && isPending
  };
}

function buildSelectedRequestViewModel(
  selectedRequest: SelectedRequest,
  params: Pick<
    BuildRequestsTabViewModelParams,
    "profileNamesByPubkey" | "getUnreadCount" | "toFallbackDisplayId" | "requestTimestamps" | "statusEvents" | "counterpartyProfiles" | "viewerRole"
  >
): SelectedRequestViewModel {
  const item = buildRequestListItem({
    request: selectedRequest.request,
    segment: selectedRequest.segment,
    ...params
  });

  const counterpartyPubkey = getCounterpartyPubkey(
    selectedRequest.request,
    selectedRequest.segment
  );

  return {
    ...item,
    recipientPubkey: counterpartyPubkey,
    counterpartyProfile: params.counterpartyProfiles[counterpartyPubkey],
    statusHistory: buildStatusHistory(
      selectedRequest.request,
      params.requestTimestamps,
      params.statusEvents
    ),
    viewerRole: params.viewerRole
  };
}

export function buildRequestsTabViewModel({
  requestItems,
  requestSegment,
  selectedRequest,
  profileNamesByPubkey,
  getUnreadCount,
  getUnreadTotal,
  toFallbackDisplayId,
  requestTimestamps,
  statusEvents,
  counterpartyProfiles,
  viewerRole
}: BuildRequestsTabViewModelParams): RequestsTabViewModel {
  const selectedRequestViewModel = selectedRequest
    ? buildSelectedRequestViewModel(selectedRequest, {
        profileNamesByPubkey,
        getUnreadCount,
        toFallbackDisplayId,
        requestTimestamps,
        statusEvents,
        counterpartyProfiles,
        viewerRole
      })
    : null;

  const incomingGroups =
    requestSegment === "incoming"
      ? groupIncomingRequests(requestItems).map((group) => {
          const slot = group[0];
          const threadKeys = group.map((request) => requestMessageThreadKey(request));
          const requests = group.map((request) =>
            buildRequestListItem({
              request,
              segment: "incoming",
              profileNamesByPubkey,
              getUnreadCount,
              toFallbackDisplayId
            })
          );

          return {
            slotAllocationKey: slot.slotAllocationKey,
            scheduledAt: slot.scheduledAt,
            scheduledEnd: slot.scheduledEnd,
            candidateCount: group.length,
            isAllocated: group.some((request) => request.status === "accepted"),
            pendingCount: group.filter((request) => request.status === "pending").length,
            unreadCount: getUnreadTotal(threadKeys),
            requests
          };
        })
      : [];

  const outgoingRequests =
    requestSegment === "outgoing"
      ? [...requestItems]
          .sort(
            (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)
          )
          .map((request) =>
            buildRequestListItem({
              request,
              segment: "outgoing",
              profileNamesByPubkey,
              getUnreadCount,
              toFallbackDisplayId
            })
          )
      : [];

  return {
    selectedRequest: selectedRequestViewModel,
    incomingGroups,
    outgoingRequests,
    isEmpty: requestItems.length === 0
  };
}
