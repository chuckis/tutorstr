import { AccountRole } from "../../domain/account";
import { assertRole } from "../account/assertRole";
import type { BlogDraft } from "../../domain/blog";
import type { DraftRepository } from "../../ports/draftRepository";

export class GetMyDrafts {
  constructor(private draftRepo: DraftRepository) {}

  async execute(viewerRole: AccountRole): Promise<BlogDraft[]> {
    assertRole(viewerRole, "tutor");
    return this.draftRepo.getAll();
  }
}
