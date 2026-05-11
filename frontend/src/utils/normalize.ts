import { TutorProfile, TutorSchedule } from "../types/nostr";

export const emptyProfile: TutorProfile = {
  name: "",
  bio: "",
  subjects: [],
  languages: [],
  hourlyRate: 0,
  avatarUrl: ""
};

export const emptySchedule: TutorSchedule = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  slots: []
};

export function normalizeProfile(input: Partial<TutorProfile> | null | undefined) {
  return {
    ...emptyProfile,
    ...input,
    subjects: Array.isArray(input?.subjects) ? input?.subjects : [],
    languages: Array.isArray(input?.languages) ? input?.languages : []
  };
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
