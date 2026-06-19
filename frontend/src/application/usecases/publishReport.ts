import { ReportRepository } from "../../ports/reportRepository";

const MAX_REPORTS_PER_HOUR = 5;

export class PublishReport {
  constructor(
    private reportRepo: ReportRepository,
  ) {}

  async execute(
    targetPubkey: string,
    reason: string,
    options?: { eventId?: string; label?: string },
  ): Promise<string> {
    return this.reportRepo.publish(targetPubkey, reason, options);
  }
}

export class ReportRateLimitError extends Error {
  constructor() {
    super("Too many reports. Please try again later.");
    this.name = "ReportRateLimitError";
  }
}
