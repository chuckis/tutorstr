import { Booking } from "../../domain/booking";
import { makeSlotAllocationKey } from "../../domain/slotAllocation";
import { BookingRepository } from "../../ports/bookingRepository";
import { BookingRequestEvent } from "../../types/nostr";
import { bookingStatusToNostr } from "./bookingAdapter";

type PublishBookingStatus = (
  studentPubkey: string,
  payload: {
    bookingId: string;
    status: ReturnType<typeof bookingStatusToNostr>;
    note?: string;
    reason?: Booking["resolutionReason"];
    slotAllocationKey?: string;
  }
) => Promise<void>;

type CreateNostrBookingRepositoryParams = {
  userId: string;
  incoming: Booking[];
  outgoing: Booking[];
  requestMap: Record<string, BookingRequestEvent>;
  requestsByAllocationKey: Record<string, Booking[]>;
  publishBookingStatus: PublishBookingStatus;
};

export function createNostrBookingRepository({
  userId,
  incoming,
  outgoing,
  requestMap,
  requestsByAllocationKey,
  publishBookingStatus
}: CreateNostrBookingRepositoryParams): BookingRepository {
  return {
    async getIncoming(targetUserId: string) {
      return targetUserId === userId ? incoming : [];
    },
    async getOutgoing(targetUserId: string) {
      return targetUserId === userId ? outgoing : [];
    },
    async getById(id: string) {
      return incoming.find((booking) => booking.id === id) ||
        outgoing.find((booking) => booking.id === id) ||
        null;
    },
    async getByAllocationKey(allocationKey: string) {
      return requestsByAllocationKey[allocationKey] || [];
    },
    async updateStatus(
      id: string,
      status: Booking["status"],
      options?: { reason?: Booking["resolutionReason"] }
    ) {
      const request = requestMap[id];
      if (!request || status === "pending") {
        return;
      }

      const recipient =
        status === "cancelled" ? request.tutorPubkey : request.pubkey;

      await publishBookingStatus(recipient, {
        bookingId: id,
        status: bookingStatusToNostr(status),
        reason: options?.reason,
        slotAllocationKey:
          request.request.slotAllocationKey ||
          makeSlotAllocationKey(request.tutorPubkey, request.request.requestedSlot)
      });
    }
  };
}
