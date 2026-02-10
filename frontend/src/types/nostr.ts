export type TutorProfile = {
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
};

export type TutorProfileEvent = {
  pubkey: string;
  created_at: number;
  profile: TutorProfile;
};

export type ScheduleSlot = {
  start: string;
  end: string;
};

export type TutorSchedule = {
  timezone: string;
  slots: ScheduleSlot[];
};

export type TutorScheduleEvent = {
  pubkey: string;
  created_at: number;
  schedule: TutorSchedule;
};
