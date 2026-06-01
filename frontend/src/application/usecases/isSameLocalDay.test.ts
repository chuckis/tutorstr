import { describe, expect, it } from "vitest";
import { isSameLocalDay } from "./isSameLocalDay";

describe("isSameLocalDay", () => {
  it("returns true for two dates on the same local day", () => {
    const morning = new Date(2026, 5, 1, 8, 0);
    const evening = new Date(2026, 5, 1, 22, 30);

    expect(isSameLocalDay(morning, evening)).toBe(true);
  });

  it("returns false for two dates on different local days", () => {
    const a = new Date(2026, 5, 1, 23, 59);
    const b = new Date(2026, 5, 2, 0, 1);

    expect(isSameLocalDay(a, b)).toBe(false);
  });

  it("is symmetric", () => {
    const a = new Date(2026, 0, 15, 10, 0);
    const b = new Date(2026, 0, 15, 18, 0);

    expect(isSameLocalDay(a, b)).toBe(isSameLocalDay(b, a));
  });
});
