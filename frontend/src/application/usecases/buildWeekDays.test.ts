import { describe, expect, it } from "vitest";
import { buildWeekDays } from "./buildWeekDays";

describe("buildWeekDays", () => {
  it("returns a Monday-anchored week when weekStartsOn=1", () => {
    const anchor = new Date(2026, 5, 3, 14, 30);
    const days = buildWeekDays(anchor, 1);

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 5, 1));
    expect(days[6]).toEqual(new Date(2026, 5, 7));
  });

  it("returns a Sunday-anchored week when weekStartsOn=0", () => {
    const anchor = new Date(2026, 5, 3, 14, 30);
    const days = buildWeekDays(anchor, 0);

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 4, 31));
    expect(days[6]).toEqual(new Date(2026, 5, 6));
  });

  it("defaults to Monday anchor", () => {
    const anchor = new Date(2026, 0, 15);
    const days = buildWeekDays(anchor);

    expect(days[0].getDay()).toBe(1);
  });

  it("crosses a month boundary", () => {
    const anchor = new Date(2026, 0, 30);
    const days = buildWeekDays(anchor, 1);

    expect(days[0]).toEqual(new Date(2026, 0, 26));
    expect(days[4]).toEqual(new Date(2026, 0, 30));
    expect(days[5]).toEqual(new Date(2026, 0, 31));
    expect(days[6]).toEqual(new Date(2026, 1, 1));
  });

  it("crosses a year boundary", () => {
    const anchor = new Date(2026, 0, 1);
    const days = buildWeekDays(anchor, 1);

    expect(days[0]).toEqual(new Date(2025, 11, 29));
    expect(days[3]).toEqual(new Date(2026, 0, 1));
    expect(days[6]).toEqual(new Date(2026, 0, 4));
  });

  it("returns seven consecutive days", () => {
    const days = buildWeekDays(new Date(2026, 5, 3), 1);

    for (let i = 1; i < days.length; i += 1) {
      const diffMs = days[i].getTime() - days[i - 1].getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });
});
