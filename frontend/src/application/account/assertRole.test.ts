import { describe, expect, it } from "vitest";
import { UnsupportedAccountRoleError } from "../../domain/account";
import { assertRole, RoleMismatchError } from "./assertRole";

describe("assertRole", () => {
  it("passes silently when actual matches expected", () => {
    expect(() => assertRole("tutor", "tutor")).not.toThrow();
    expect(() => assertRole("student", "student")).not.toThrow();
  });

  it("throws RoleMismatchError when roles differ", () => {
    try {
      assertRole("tutor", "student");
    } catch (error) {
      expect(error).toBeInstanceOf(RoleMismatchError);
      expect((error as RoleMismatchError).actual).toBe("tutor");
      expect((error as RoleMismatchError).expected).toBe("student");
      return;
    }

    throw new Error("expected assertRole to throw");
  });

  it("throws UnsupportedAccountRoleError for unknown actual role", () => {
    expect(() => assertRole("admin" as never, "tutor")).toThrow(
      UnsupportedAccountRoleError
    );
  });
});
