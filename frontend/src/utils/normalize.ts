import { UserProfile, isAvailabilityMode, isRole } from "../domain/profile";
import { TutorSchedule } from "../domain/schedule";

export const emptyProfile: UserProfile = {
  name: "",
  bio: "",
  subjects: [],
  languages: [],
  hourlyRate: 0,
  avatarUrl: "",
  availabilityMode: undefined,
  role: undefined,
  timezone: undefined,
  workHours: undefined
};

export const emptySchedule: TutorSchedule = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  slots: []
};

export function normalizeProfile(input: Record<string, unknown> | null | undefined): UserProfile {
  const rawMode = input?.availabilityMode;
  const rawRole = input?.role;
  return {
    name: typeof input?.name === "string" ? input.name : "",
    bio: typeof input?.bio === "string" ? input.bio : typeof input?.about === "string" ? input.about : "",
    subjects: Array.isArray(input?.subjects) ? input.subjects as string[] : [],
    languages: Array.isArray(input?.languages) ? input.languages as string[] : [],
    hourlyRate: typeof input?.hourlyRate === "number" ? input.hourlyRate : 0,
    avatarUrl: typeof input?.avatarUrl === "string" ? input.avatarUrl : typeof input?.picture === "string" ? input.picture : "",
    availabilityMode: typeof rawMode === "string" && isAvailabilityMode(rawMode) ? rawMode : undefined,
    role: typeof rawRole === "string" && isRole(rawRole) ? rawRole : undefined,
    timezone: typeof input?.timezone === "string" ? input.timezone : undefined,
    workHours: typeof input?.workHours === "string" ? input.workHours : undefined
  };
}

export function isProfileEmpty(profile: UserProfile) {
  return (
    !profile.name.trim() &&
    !profile.bio.trim() &&
    profile.subjects.length === 0 &&
    profile.languages.length === 0 &&
    !profile.hourlyRate &&
    !profile.avatarUrl.trim()
  );
}

export function normalizeSchedule(
  input: Partial<TutorSchedule> | null | undefined
) {
  return {
    ...emptySchedule,
    ...input,
    slots: Array.isArray(input?.slots) ? input?.slots : []
  };
}

export function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
