import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { TutorSchedule } from "../../types/nostr";

export type SchedulePublisher = (schedule: TutorSchedule) => Promise<void>;

export class PublishTutorSchedule {
  constructor(private publishSchedule: SchedulePublisher) {}

  async execute(schedule: TutorSchedule, viewerRole: AccountRole): Promise<void> {
    assertRole(viewerRole, "tutor");
    await this.publishSchedule(schedule);
  }
}
