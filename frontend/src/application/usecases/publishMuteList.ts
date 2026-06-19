import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import { MuteListRepository } from "../../ports/muteListRepository";

const MAX_MUTE_ACTIONS_PER_HOUR = 10;

export class PublishMuteList {
  constructor(
    private muteListRepo: MuteListRepository,
  ) {}

  async execute(
    pubkey: string,
    mutedPubkeys: string[],
    viewerRole: AccountRole,
  ): Promise<string> {
    assertRole(viewerRole, "tutor");

    if (mutedPubkeys.length > MAX_MUTE_ACTIONS_PER_HOUR) {
      throw new RateLimitError(
        `Cannot mute more than ${MAX_MUTE_ACTIONS_PER_HOUR} users per action`,
      );
    }

    return this.muteListRepo.publish(pubkey, mutedPubkeys);
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
