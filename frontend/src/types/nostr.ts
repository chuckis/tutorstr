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

export type BookingRequest = {
  bookingId: string;
  requestedSlot: ScheduleSlot;
  message: string;
  studentNpub: string;
};

export type BookingRequestEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  tutorPubkey: string;
  request: BookingRequest;
};

export type BookingStatus = {
  bookingId: string;
  status: "accepted" | "rejected" | "completed" | "cancelled";
  note?: string;
};

export type BookingStatusEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  studentPubkey: string;
  status: BookingStatus;
};

export type EncryptedMessage = {
  id: string;
  created_at: number;
  pubkey: string;
  counterparty: string;
  content: string;
};

export type ProgressEntry = {
  bookingId?: string;
  topic: string;
  notes: string;
  score?: number;
};

export type ProgressEntryEvent = {
  id: string;
  created_at: number;
  pubkey: string;
  counterparty: string;
  entry: ProgressEntry;
};
