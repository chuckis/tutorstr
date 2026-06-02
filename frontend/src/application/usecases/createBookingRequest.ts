import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { TimeSlot } from "../../domain/TimeSlot";

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
  constructor(private publishBookingRequest: BookingRequestPublisher) {}

  async execute(input: BookingRequestPayload, viewerRole: AccountRole): Promise<unknown> {
    assertRole(viewerRole, "student");
    const { tutorPubkey, ...rest } = input;
    return this.publishBookingRequest(tutorPubkey, rest);
  }
}
