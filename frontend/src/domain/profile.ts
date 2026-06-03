export type TutorProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
};

export function hasRoleTag(tags: string[][], role: "tutor" | "student"): boolean {
  return tags.some(([k, v]) => k === "t" && v === `role:${role}`);
}
