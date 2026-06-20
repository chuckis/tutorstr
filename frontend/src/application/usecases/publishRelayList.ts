import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { RelayListItem } from "../../domain/relayList";

export type RelayListPublisher = (relays: RelayListItem[]) => Promise<void>;

export class PublishRelayList {
  constructor(
    private publishRelays: RelayListPublisher,
  ) {}

  async execute(
    relays: RelayListItem[],
    viewerRole: AccountRole,
  ): Promise<void> {
    assertRole(viewerRole, "tutor");

    await this.publishRelays(relays);
  }
}
