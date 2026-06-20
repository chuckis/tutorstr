import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { Lesson, LessonStatus } from "../../domain/lesson";
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";

export type LessonStatusSnapshot = { status: LessonStatus };

export class InvalidLessonStatusTransitionError extends Error {
  constructor(public readonly from: LessonStatus, public readonly to: LessonStatus) {
    super(`Invalid lesson status transition: ${from} -> ${to}`);
    this.name = "InvalidLessonStatusTransitionError";
  }
}

export class ChangeLessonStatus {
  constructor(
    private lessons: LessonRepository,
    private bookings: BookingRepository,
    private onOptimisticUpdate?: (lessonId: string, status: LessonStatus) => void,
    private onRollback?: (lessonId: string, snapshot: LessonStatusSnapshot | undefined) => void,
  ) {}

  async execute(
    lesson: Lesson,
    nextStatus: LessonStatus,
    viewerRole: AccountRole,
    viewerPubkey: string
  ): Promise<void> {
    if (!isTransitionAllowed(lesson.status, nextStatus)) {
      throw new InvalidLessonStatusTransitionError(lesson.status, nextStatus);
    }

    if (nextStatus === "completed" || nextStatus === "canceled") {
      assertRole(viewerRole, "tutor");
    }

    const snapshot: LessonStatusSnapshot = { status: lesson.status };
    this.onOptimisticUpdate?.(lesson.id, nextStatus);

    try {
      await this.lessons.updateStatus(lesson.id, nextStatus);

      if (nextStatus === "canceled" && lesson.status === "scheduled") {
        await this.bookings.updateStatus(lesson.bookingId, "cancelled", {
          reason: "tutor_rejected"
        });
      }
    } catch (error) {
      this.onRollback?.(lesson.id, snapshot);
      throw error;
    }
  }
}

function isTransitionAllowed(from: LessonStatus, to: LessonStatus): boolean {
  if (from === to) {
    return false;
  }
  if (from === "scheduled") {
    return to === "completed" || to === "canceled";
  }
  return false;
}
