export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type Booking = {
  id: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  scheduledEnd?: string;
  status: BookingStatus;
  requestEventId?: string;
};
