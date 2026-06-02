import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ROLES,
  LEGACY_ACCOUNT_ROLE,
  MissingRoleError,
  UnsupportedAccountRoleError,
  isAccountRole
} from "./account";

describe("account role domain", () => {
  it("exposes exactly the agreed roles", () => {
    expect([...ACCOUNT_ROLES]).toEqual(["tutor", "student"]);
  });

  it("defaults the legacy fallback to tutor", () => {
    expect(LEGACY_ACCOUNT_ROLE).toBe("tutor");
  });

  it("isAccountRole narrows known values", () => {
    expect(isAccountRole("tutor")).toBe(true);
    expect(isAccountRole("student")).toBe(true);
  });

  it("isAccountRole rejects unknown values", () => {
    expect(isAccountRole("admin")).toBe(false);
    expect(isAccountRole("")).toBe(false);
    expect(isAccountRole("TUTOR")).toBe(false);
  });

  it("UnsupportedAccountRoleError carries the offending value", () => {
    const error = new UnsupportedAccountRoleError("admin");

    expect(error.name).toBe("UnsupportedAccountRoleError");
    expect(error.message).toContain("admin");
  });

  it("MissingRoleError maps to the i18n key", () => {
    const error = new MissingRoleError();

    expect(error.name).toBe("MissingRoleError");
    expect(error.message).toBe("auth.runtime.missingRole");
  });
});
