export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type BookingResolutionReason =
  | "tutor_rejected"
  | "duplicate_bid"
  | "slot_filled"
  | "student_cancelled";

export type Booking = {
  id: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  scheduledEnd?: string;
  status: BookingStatus;
  requestEventId?: string;
  slotAllocationKey: string;
  resolutionReason?: BookingResolutionReason;
};
