import { describe, expect, it, vi } from "vitest";
import {
  CreateBookingRequest,
  BookingRequestPayload
} from "./createBookingRequest";
import { RoleMismatchError } from "../account/assertRole";

const basePayload: BookingRequestPayload = {
  tutorPubkey: "tutor-1",
  requestedSlot: {
    start: "2026-05-09T10:00:00.000Z",
    end: "2026-05-09T11:00:00.000Z"
  },
  message: "I'd like to book a lesson",
  studentNpub: "npub1student",
  slotAllocationKey: "slot-key-1"
};

describe("CreateBookingRequest", () => {
  it("publishes a booking request when the viewer is a student", async () => {
    const publishBookingRequest = vi.fn().mockResolvedValue({ ok: true });
    const useCase = new CreateBookingRequest(publishBookingRequest);

    const result = await useCase.execute(basePayload, "student");

    expect(publishBookingRequest).toHaveBeenCalledWith("tutor-1", {
      requestedSlot: basePayload.requestedSlot,
      message: basePayload.message,
      studentNpub: basePayload.studentNpub,
      slotAllocationKey: basePayload.slotAllocationKey
    });
    expect(result).toEqual({ ok: true });
  });

  it("passes the payload through without the tutorPubkey wrapper", async () => {
    const publishBookingRequest = vi.fn().mockResolvedValue(undefined);
    const useCase = new CreateBookingRequest(publishBookingRequest);

    await useCase.execute(basePayload, "student");

    const [, forwarded] = publishBookingRequest.mock.calls[0];
    expect(forwarded).not.toHaveProperty("tutorPubkey");
    expect(forwarded).toMatchObject({
      requestedSlot: basePayload.requestedSlot,
      message: basePayload.message,
      studentNpub: basePayload.studentNpub,
      slotAllocationKey: basePayload.slotAllocationKey
    });
  });

  it("forwards the slot allocation key when present", async () => {
    const publishBookingRequest = vi.fn().mockResolvedValue(undefined);
    const useCase = new CreateBookingRequest(publishBookingRequest);

    await useCase.execute(basePayload, "student");

    expect(publishBookingRequest).toHaveBeenCalledWith(
      basePayload.tutorPubkey,
      expect.objectContaining({ slotAllocationKey: basePayload.slotAllocationKey })
    );
  });

  it("refuses to run when the viewer is a tutor", async () => {
    const publishBookingRequest = vi.fn();
    const useCase = new CreateBookingRequest(publishBookingRequest);

    await expect(useCase.execute(basePayload, "tutor")).rejects.toBeInstanceOf(
      RoleMismatchError
    );

    expect(publishBookingRequest).not.toHaveBeenCalled();
  });
});
