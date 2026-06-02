export const ACCOUNT_ROLES = ["tutor", "student"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const LEGACY_ACCOUNT_ROLE: AccountRole = "tutor";

export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value);
}

export class UnsupportedAccountRoleError extends Error {
  constructor(value: string) {
    super(`Unsupported account role: ${value}`);
    this.name = "UnsupportedAccountRoleError";
  }
}

export class MissingRoleError extends Error {
  constructor() {
    super("auth.runtime.missingRole");
    this.name = "MissingRoleError";
  }
}
