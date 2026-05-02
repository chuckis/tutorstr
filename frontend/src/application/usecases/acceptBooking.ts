import { isActiveBookingStatus } from "../../domain/slotAllocation";
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
      subject: "",
      status: "scheduled"
    })
  ) {}

  async execute(bookingId: string) {
    const booking = await this.bookingRepo.getById(bookingId);
    if (!booking) {
      return;
    }

    const group = await this.bookingRepo.getByAllocationKey(
      booking.slotAllocationKey
    );
    const existingWinner = group.find(
      (entry) => entry.id !== booking.id && entry.status === "accepted"
    );

    if (existingWinner) {
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

    await Promise.all(
      group
        .filter((entry) => entry.id !== booking.id)
        .filter((entry) => isActiveBookingStatus(entry.status))
        .map((entry) =>
          this.bookingRepo.updateStatus(entry.id, "rejected", {
            reason: "slot_filled"
          })
        )
    );
  }
}
