import { UserProfile } from "../domain/profile";
import { TutorSchedule } from "../domain/schedule";

export type UserProfileEvent = {
  pubkey: string;
  created_at: number;
  tags: string[][];
  profile: UserProfile;
};

export type TutorScheduleEvent = {
  pubkey: string;
  created_at: number;
  schedule: TutorSchedule;
};
