import { describe, expect, it, vi } from "vitest";
import { PublishReport } from "./publishReport";
import type { ReportRepository } from "../../ports/reportRepository";

function makeRepo(): ReportRepository {
  return {
    publish: vi.fn().mockResolvedValue("event-1"),
  };
}

describe("PublishReport", () => {
  it("publishes a report with target and reason", async () => {
    const repo = makeRepo();
    const useCase = new PublishReport(repo);

    const id = await useCase.execute("bad-actor", "Spam in DMs");

    expect(id).toBe("event-1");
    expect(repo.publish).toHaveBeenCalledWith("bad-actor", "Spam in DMs", undefined);
  });

  it("publishes a report with label", async () => {
    const repo = makeRepo();
    const useCase = new PublishReport(repo);

    await useCase.execute("bad-actor", "Impersonation", { label: "impersonation" });

    expect(repo.publish).toHaveBeenCalledWith("bad-actor", "Impersonation", {
      label: "impersonation",
    });
  });

  it("publishes a report with event reference", async () => {
    const repo = makeRepo();
    const useCase = new PublishReport(repo);

    await useCase.execute("bad-actor", "Nudity", { eventId: "event-abc", label: "nudity" });

    expect(repo.publish).toHaveBeenCalledWith("bad-actor", "Nudity", {
      eventId: "event-abc",
      label: "nudity",
    });
  });
});
