export type LessonStatus = "scheduled" | "completed" | "canceled";

export type Lesson = {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  durationMin: number;
  subject: string;
  status: LessonStatus;
};
