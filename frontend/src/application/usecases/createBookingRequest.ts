import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { TimeSlot } from "../../domain/TimeSlot";
import { BookingRequestEvent } from "../../ports/bookingEventsRepository";

export type BookingRequestPayload = {
  tutorPubkey: string;
  requestedSlot: TimeSlot;
  message: string;
  studentNpub: string;
  slotAllocationKey?: string;
};

export type BookingRequestPublisher = (
  tutorPubkey: string,
  payload: Omit<BookingRequestPayload, "tutorPubkey"> & { slotAllocationKey?: string }
) => Promise<unknown>;

export class CreateBookingRequest {
  constructor(
    private publishBookingRequest: BookingRequestPublisher,
    private onOptimisticUpdate?: (request: BookingRequestEvent) => void,
    private onRollback?: (bookingId: string) => void,
  ) {}

  async execute(
    input: BookingRequestPayload,
    viewerRole: AccountRole,
    bookingRequestEvent?: BookingRequestEvent,
  ): Promise<unknown> {
    assertRole(viewerRole, "student");
    const { tutorPubkey, ...rest } = input;

    if (bookingRequestEvent) {
      this.onOptimisticUpdate?.(bookingRequestEvent);
    }

    try {
      return await this.publishBookingRequest(tutorPubkey, rest);
    } catch (error) {
      if (bookingRequestEvent) {
        this.onRollback?.(bookingRequestEvent.id);
      }
      throw error;
    }
  }
}
