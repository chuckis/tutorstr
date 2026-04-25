import { ScheduleSlot } from "../types/nostr";

export function makeSlotAllocationKey(
  tutorPubkey: string,
  slot: ScheduleSlot
) {
  return [tutorPubkey, slot.start, slot.end].join("|");
}

export function makeSlotBidKey(
  tutorPubkey: string,
  studentPubkey: string,
  slot: ScheduleSlot
) {
  return [makeSlotAllocationKey(tutorPubkey, slot), studentPubkey].join("|");
}

export function getSlotEndFromDuration(start: string, durationMin: number) {
  const startTs = Date.parse(start);
  if (Number.isNaN(startTs) || !Number.isFinite(durationMin) || durationMin <= 0) {
    return start;
  }

  return new Date(startTs + durationMin * 60000).toISOString();
}

export function isActiveBookingStatus(status: string) {
  return status === "pending" || status === "accepted";
}
