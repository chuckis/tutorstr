import { isActiveBookingStatus } from "../../domain/slotAllocation";
import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { Lesson, LessonStatus } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";

export type LessonFactory = (input: {
  bookingId: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
}) => Lesson;

export type AcceptBookingSnapshot = {
  bookingStatus: string;
  competitorStatuses: { bookingId: string; status: string }[];
};

export class AcceptBooking {
  constructor(
    private bookingRepo: BookingRepository,
    private lessonRepo: LessonRepository,
    private createLesson: LessonFactory,
    private onOptimisticUpdate?: (
      bookingId: string,
      lesson: Lesson,
      rejectedCompetitorIds: string[],
    ) => void,
    private onRollback?: (snapshot: AcceptBookingSnapshot) => void,
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

    const lesson = this.createLesson({
      bookingId: booking.id,
      tutorId: booking.tutorId,
      studentId: booking.studentId,
      scheduledAt: booking.scheduledAt
    });

    const rejectedCompetitorIds = group
      .filter((entry) => entry.id !== booking.id)
      .filter((entry) => !canceledAcceptedBookingIds.has(entry.id))
      .filter((entry) => isActiveBookingStatus(entry.status))
      .map((entry) => entry.id);

    const snapshot: AcceptBookingSnapshot = {
      bookingStatus: booking.status,
      competitorStatuses: group
        .filter((e) => e.id !== booking.id)
        .map((e) => ({ bookingId: e.id, status: e.status })),
    };

    this.onOptimisticUpdate?.(bookingId, lesson, rejectedCompetitorIds);

    try {
      await this.bookingRepo.updateStatus(bookingId, "accepted");
      await this.lessonRepo.save(lesson);
      await Promise.all(
        rejectedCompetitorIds.map((id) =>
          this.bookingRepo.updateStatus(id, "rejected", {
            reason: "slot_filled"
          })
        )
      );
    } catch (error) {
      this.onRollback?.(snapshot);
      throw error;
    }
  }
}
