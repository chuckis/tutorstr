import { AccountRole, UnsupportedAccountRoleError } from "../../domain/account";

export class RoleMismatchError extends Error {
  constructor(
    public readonly actual: AccountRole,
    public readonly expected: AccountRole
  ) {
    super(`Role mismatch: expected "${expected}", got "${actual}"`);
    this.name = "RoleMismatchError";
  }
}

export function assertRole(actual: AccountRole, expected: AccountRole): void {
  if (!ACCOUNT_ROLES_SET.has(actual)) {
    throw new UnsupportedAccountRoleError(actual);
  }

  if (actual !== expected) {
    throw new RoleMismatchError(actual, expected);
  }
}

const ACCOUNT_ROLES_SET: ReadonlySet<AccountRole> = new Set([
  "tutor",
  "student"
]);
