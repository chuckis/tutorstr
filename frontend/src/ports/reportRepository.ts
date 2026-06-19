export type ReportPayload = {
  targetPubkey: string;
  targetEventId?: string;
  reason: string;
  label?: string;
};

export interface ReportRepository {
  publish(
    targetPubkey: string,
    reason: string,
    options?: { eventId?: string; label?: string },
  ): Promise<string>;
}
