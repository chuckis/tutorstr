import { TimeSlot } from "./TimeSlot";

export type TutorSchedule = {
  timezone: string;
  slots: TimeSlot[];
};
