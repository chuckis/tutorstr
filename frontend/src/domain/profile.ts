export type AvailabilityMode = "remote" | "offline" | "hybrid";

export const AVAILABILITY_MODES: AvailabilityMode[] = ["remote", "offline", "hybrid"];

export function isAvailabilityMode(value: string): value is AvailabilityMode {
  return AVAILABILITY_MODES.includes(value as AvailabilityMode);
}

export type TutorProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
  availabilityMode?: AvailabilityMode;
};

export function hasRoleTag(tags: string[][], role: "tutor" | "student"): boolean {
  return tags.some(([k, v]) => k === "t" && v === `role:${role}`);
}
