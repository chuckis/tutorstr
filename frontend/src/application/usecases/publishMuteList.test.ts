import { describe, expect, it, vi } from "vitest";
import { PublishMuteList, RateLimitError } from "./publishMuteList";
import { RoleMismatchError } from "../account/assertRole";
import type { MuteListRepository } from "../../ports/muteListRepository";

function makeRepo(): MuteListRepository {
  return {
    subscribe: vi.fn(),
    subscribeAll: vi.fn(),
    publish: vi.fn().mockResolvedValue("event-1"),
  };
}

describe("PublishMuteList", () => {
  it("publishes the mute list when viewer is a tutor", async () => {
    const repo = makeRepo();
    const useCase = new PublishMuteList(repo);

    const id = await useCase.execute("tutor-1", ["student-1", "student-2"], "tutor");

    expect(id).toBe("event-1");
    expect(repo.publish).toHaveBeenCalledWith("tutor-1", ["student-1", "student-2"]);
  });

  it("throws RoleMismatchError when viewer is a student", async () => {
    const repo = makeRepo();
    const useCase = new PublishMuteList(repo);

    await expect(
      useCase.execute("student-1", ["tutor-1"], "student"),
    ).rejects.toBeInstanceOf(RoleMismatchError);

    expect(repo.publish).not.toHaveBeenCalled();
  });

  it("throws RateLimitError when too many pubkeys in one action", async () => {
    const repo = makeRepo();
    const useCase = new PublishMuteList(repo);

    const many = Array.from({ length: 11 }, (_, i) => `user-${i}`);

    await expect(
      useCase.execute("tutor-1", many, "tutor"),
    ).rejects.toBeInstanceOf(RateLimitError);

    expect(repo.publish).not.toHaveBeenCalled();
  });
});
