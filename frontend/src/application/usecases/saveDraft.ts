import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { BlogDraft } from "../../domain/blog";
import type { DraftRepository } from "../../ports/draftRepository";

export class SaveDraft {
  constructor(private draftRepo: DraftRepository) {}

  async execute(
    draft: BlogDraft,
    viewerRole: AccountRole
  ): Promise<void> {
    assertRole(viewerRole, "tutor");
    await this.draftRepo.save(draft);
  }
}
