import { TutorProfile } from "../domain/profile";
import { TutorSchedule } from "../domain/schedule";

export type TutorProfileEvent = {
  pubkey: string;
  created_at: number;
  profile: TutorProfile;
};

export type TutorScheduleEvent = {
  pubkey: string;
  created_at: number;
  schedule: TutorSchedule;
};
