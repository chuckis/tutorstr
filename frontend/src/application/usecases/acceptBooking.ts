import { Lesson } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";

type LessonFactory = (input: {
  bookingId: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
}) => Lesson;

export class AcceptBooking {
  constructor(
    private bookingRepo: BookingRepository,
    private lessonRepo: LessonRepository,
    private createLesson: LessonFactory = ({
      bookingId,
      tutorId,
      studentId,
      scheduledAt
    }) => ({
      id: crypto.randomUUID(),
      bookingId,
      tutorId,
      studentId,
      scheduledAt,
      durationMin: 60,
      subject: "Tutoring lesson",
      status: "scheduled"
    })
  ) {}

  async execute(bookingId: string) {
    const booking = await this.bookingRepo.getById(bookingId);
    if (!booking) {
      return;
    }

    await this.bookingRepo.updateStatus(bookingId, "accepted");

    await this.lessonRepo.save(
      this.createLesson({
        bookingId: booking.id,
        tutorId: booking.tutorId,
        studentId: booking.studentId,
        scheduledAt: booking.scheduledAt
      })
    );
  }
}
