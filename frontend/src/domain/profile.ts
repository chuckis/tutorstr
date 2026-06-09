export type AvailabilityMode = "remote" | "offline" | "hybrid";

export const AVAILABILITY_MODES: AvailabilityMode[] = ["remote", "offline", "hybrid"];

export function isAvailabilityMode(value: string): value is AvailabilityMode {
  return AVAILABILITY_MODES.includes(value as AvailabilityMode);
}

export type Role = "tutor" | "student";

export const ROLES: Role[] = ["tutor", "student"];

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export const COMMON_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Kyiv",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export type UserProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
  availabilityMode?: AvailabilityMode;
  role?: Role;
  timezone?: string;
  workHours?: string;
};

export function hasRoleTag(tags: string[][], role: "tutor" | "student"): boolean {
  return tags.some(([k, v]) => k === "t" && v === `role:${role}`);
}

export const PROFILE_SCHEMA_VERSION = 1;

export function hasSchemaTag(tags: string[][], version: number = PROFILE_SCHEMA_VERSION): boolean {
  return tags.some(([k, v]) => k === "t" && v === `schema:${version}`);
}
