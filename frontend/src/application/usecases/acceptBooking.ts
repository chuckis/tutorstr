import { isActiveBookingStatus } from "../../domain/slotAllocation";
import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { Lesson } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";

export type LessonFactory = (input: {
  bookingId: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
}) => Lesson;

export class AcceptBooking {
  constructor(
    private bookingRepo: BookingRepository,
    private lessonRepo: LessonRepository,
    private createLesson: LessonFactory
  ) {}

  async execute(bookingId: string, viewerRole: AccountRole) {
    assertRole(viewerRole, "tutor");

    const booking = await this.bookingRepo.getById(bookingId);
    if (!booking) {
      return;
    }

    const group = await this.bookingRepo.getByAllocationKey(
      booking.slotAllocationKey
    );
    const acceptedCompetitors = group.filter(
      (entry) => entry.id !== booking.id && entry.status === "accepted"
    );
    const acceptedCompetitorStates = await Promise.all(
      acceptedCompetitors.map(async (entry) => {
        const lesson = await this.lessonRepo.getById(entry.id);
        return {
          bookingId: entry.id,
          isCanceled: lesson?.status === "canceled"
        };
      })
    );

    if (acceptedCompetitorStates.some((entry) => !entry.isCanceled)) {
      return;
    }

    const canceledAcceptedBookingIds = new Set(
      acceptedCompetitorStates
        .filter((entry) => entry.isCanceled)
        .map((entry) => entry.bookingId)
    );

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
        .filter((entry) => !canceledAcceptedBookingIds.has(entry.id))
        .filter((entry) => isActiveBookingStatus(entry.status))
        .map((entry) =>
          this.bookingRepo.updateStatus(entry.id, "rejected", {
            reason: "slot_filled"
          })
        )
    );
  }
}
