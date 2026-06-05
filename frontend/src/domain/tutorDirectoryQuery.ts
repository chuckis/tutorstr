import { AvailabilityMode } from "./profile";

export type TutorDirectoryQuery = {
  subject?: string;
  language?: string;
  locationMode?: AvailabilityMode;
  availableNow?: boolean;
  hasFreeSlotsThisWeek?: boolean;
};
