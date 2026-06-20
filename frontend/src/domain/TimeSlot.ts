export type TimeSlot = {
  start: string;
  end: string;
};

export function isSlotInPast(slot: TimeSlot, now?: number): boolean {
  return new Date(slot.start).getTime() <= (now ?? Date.now());
}
