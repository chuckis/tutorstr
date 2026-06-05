import { UserProfile, AvailabilityMode } from "./profile";
import { TutorSchedule } from "./schedule";
import { TimeSlot, isSlotInPast } from "./TimeSlot";
import { makeSlotAllocationKey } from "./slotAllocation";

function normalizeFilter(value: string): string {
  return value.trim().toLowerCase();
}

export function tutorMatchesSubject(
  profile: UserProfile,
  filter: string
): boolean {
  const term = normalizeFilter(filter);
  if (!term) return true;
  return profile.subjects.some((s) => s.toLowerCase().includes(term));
}

export function tutorMatchesLanguage(
  profile: UserProfile,
  filter: string
): boolean {
  const term = normalizeFilter(filter);
  if (!term) return true;
  return profile.languages.some((l) => l.toLowerCase().includes(term));
}

export function tutorHasLocationMode(
  profile: UserProfile,
  mode: AvailabilityMode | undefined
): boolean {
  if (!mode) return true;
  return profile.availabilityMode === mode;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSlotWithinRange(slot: TimeSlot, from: Date, to: Date): boolean {
  const start = new Date(slot.start).getTime();
  const end = new Date(slot.end).getTime();
  return start < to.getTime() && end > from.getTime();
}

function isSlotAvailable(
  slot: TimeSlot,
  tutorPubkey: string,
  occupiedKeys: Set<string>
): boolean {
  const key = makeSlotAllocationKey(tutorPubkey, slot);
  return !occupiedKeys.has(key);
}

export function tutorHasFreeSlotsThisWeek(
  schedule: TutorSchedule | undefined,
  tutorPubkey: string,
  occupiedKeys: Set<string>
): boolean {
  if (!schedule) return false;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  return schedule.slots.some(
    (slot) =>
      !isSlotInPast(slot) &&
      isSlotWithinRange(slot, weekStart, weekEnd) &&
      isSlotAvailable(slot, tutorPubkey, occupiedKeys)
  );
}

export function tutorIsAvailableNow(
  schedule: TutorSchedule | undefined,
  tutorPubkey: string,
  occupiedKeys: Set<string>
): boolean {
  if (!schedule) return false;
  const now = Date.now();
  return schedule.slots.some((slot) => {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    return (
      start <= now &&
      now < end &&
      isSlotAvailable(slot, tutorPubkey, occupiedKeys)
    );
  });
}
