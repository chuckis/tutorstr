import { describe, expect, it, vi } from "vitest";
import { TutorSchedule } from "../../types/nostr";
import { PublishTutorSchedule } from "./publishTutorSchedule";
import { RoleMismatchError } from "../account/assertRole";

const sampleSchedule: TutorSchedule = {
  timezone: "UTC",
  slots: [
    {
      start: "2026-05-09T10:00:00.000Z",
      end: "2026-05-09T11:00:00.000Z"
    }
  ]
};

describe("PublishTutorSchedule", () => {
  it("publishes the schedule when the viewer is a tutor", async () => {
    const publishSchedule = vi.fn().mockResolvedValue(undefined);
    const useCase = new PublishTutorSchedule(publishSchedule);

    await useCase.execute(sampleSchedule, "tutor");

    expect(publishSchedule).toHaveBeenCalledWith(sampleSchedule);
    expect(publishSchedule).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the underlying publisher", async () => {
    const failure = new Error("relay down");
    const publishSchedule = vi.fn().mockRejectedValue(failure);
    const useCase = new PublishTutorSchedule(publishSchedule);

    await expect(useCase.execute(sampleSchedule, "tutor")).rejects.toBe(failure);
  });

  it("refuses to run when the viewer is a student", async () => {
    const publishSchedule = vi.fn();
    const useCase = new PublishTutorSchedule(publishSchedule);

    await expect(
      useCase.execute(sampleSchedule, "student")
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(publishSchedule).not.toHaveBeenCalled();
  });
});
