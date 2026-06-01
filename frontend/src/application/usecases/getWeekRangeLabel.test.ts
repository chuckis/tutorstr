import { describe, expect, it } from "vitest";
import { getWeekRangeLabel } from "./getWeekRangeLabel";

describe("getWeekRangeLabel", () => {
  it("formats a week within the same month in English", () => {
    const week = [
      new Date(2026, 5, 1),
      new Date(2026, 5, 2),
      new Date(2026, 5, 3),
      new Date(2026, 5, 4),
      new Date(2026, 5, 5),
      new Date(2026, 5, 6),
      new Date(2026, 5, 7)
    ];

    expect(getWeekRangeLabel(week, "en")).toBe("Jun 1 – Jun 7, 2026");
  });

  it("returns an empty string for an empty week", () => {
    expect(getWeekRangeLabel([], "en")).toBe("");
  });

  it("includes the year on the start when the week crosses a year boundary", () => {
    const week = [
      new Date(2025, 11, 29),
      new Date(2025, 11, 30),
      new Date(2025, 11, 31),
      new Date(2026, 0, 1),
      new Date(2026, 0, 2),
      new Date(2026, 0, 3),
      new Date(2026, 0, 4)
    ];

    const label = getWeekRangeLabel(week, "en");
    expect(label).toContain("2025");
    expect(label).toContain("2026");
  });

  it("renders localized output for uk and ru", () => {
    const week = [
      new Date(2026, 5, 1),
      new Date(2026, 5, 2),
      new Date(2026, 5, 3),
      new Date(2026, 5, 4),
      new Date(2026, 5, 5),
      new Date(2026, 5, 6),
      new Date(2026, 5, 7)
    ];

    expect(getWeekRangeLabel(week, "uk")).not.toBe("");
    expect(getWeekRangeLabel(week, "ru")).not.toBe("");
  });
});
