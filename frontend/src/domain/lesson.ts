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

export type LessonAgreementStatus = "scheduled" | "completed" | "cancelled";

export type LessonAgreement = {
  lessonId: string;
  bookingId: string;
  subject: string;
  scheduledAt: string;
  durationMin: number;
  price: number;
  currency: string;
  status: LessonAgreementStatus;
};
