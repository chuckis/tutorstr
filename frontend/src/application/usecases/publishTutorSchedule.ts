import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { TutorSchedule } from "../../domain/schedule";

export type SchedulePublisher = (schedule: TutorSchedule) => Promise<void>;

export type ScheduleSnapshot = { schedule: TutorSchedule };

export class PublishTutorSchedule {
  constructor(
    private publishSchedule: SchedulePublisher,
    private onOptimisticUpdate?: (pubkey: string, schedule: TutorSchedule) => void,
    private onRollback?: (pubkey: string, snapshot: ScheduleSnapshot | undefined) => void,
  ) {}

  async execute(
    schedule: TutorSchedule,
    viewerRole: AccountRole,
    pubkey?: string,
  ): Promise<void> {
    assertRole(viewerRole, "tutor");

    if (pubkey) {
      const snapshot: ScheduleSnapshot = { schedule };
      this.onOptimisticUpdate?.(pubkey, schedule);
      try {
        await this.publishSchedule(schedule);
      } catch (error) {
        this.onRollback?.(pubkey, snapshot);
        throw error;
      }
      return;
    }

    await this.publishSchedule(schedule);
  }
}
