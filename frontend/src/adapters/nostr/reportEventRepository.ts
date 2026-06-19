import { ReportRepository } from "../../ports/reportRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { nostrClient } from "../../nostr/client";

export function createNostrReportRepository(): ReportRepository {
  return {
    async publish(targetPubkey, reason, options) {
      const tags: string[][] = [["p", targetPubkey]];
      if (options?.eventId) {
        tags.push(["e", options.eventId]);
      }
      if (options?.label) {
        tags.push(["l", options.label]);
      }
      const event = await nostrClient.publishEvent(
        TutorHubKind.Report,
        reason,
        tags,
      );
      return event.id;
    },
  };
}
