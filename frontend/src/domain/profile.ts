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

export type UserProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
  availabilityMode?: AvailabilityMode;
  role?: Role;
};

export function hasRoleTag(tags: string[][], role: "tutor" | "student"): boolean {
  return tags.some(([k, v]) => k === "t" && v === `role:${role}`);
}

export const PROFILE_SCHEMA_VERSION = 1;

export function hasSchemaTag(tags: string[][], version: number = PROFILE_SCHEMA_VERSION): boolean {
  return tags.some(([k, v]) => k === "t" && v === `schema:${version}`);
}
