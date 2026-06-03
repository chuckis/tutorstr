export type TimeSlot = {
  start: string;
  end: string;
};

export function isSlotInPast(slot: TimeSlot): boolean {
  return new Date(slot.end) < new Date();
}
