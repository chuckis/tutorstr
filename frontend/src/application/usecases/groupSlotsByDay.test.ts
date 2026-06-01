import { describe, expect, it } from "vitest";
import { TimeSlot } from "../../domain/TimeSlot";
import { groupSlotsByDay } from "./groupSlotsByDay";

function makeSlot(start: string, end: string = ""): TimeSlot {
  return { start, end };
}

describe("groupSlotsByDay", () => {
  const week = [
    new Date(2026, 5, 1),
    new Date(2026, 5, 2),
    new Date(2026, 5, 3),
    new Date(2026, 5, 4),
    new Date(2026, 5, 5),
    new Date(2026, 5, 6),
    new Date(2026, 5, 7)
  ];

  it("returns empty buckets for empty input", () => {
    const result = groupSlotsByDay([], week);

    expect(result).toHaveLength(7);
    expect(result.every((bucket) => bucket.length === 0)).toBe(true);
  });

  it("places slots into the matching day bucket", () => {
    const mondayMorning = makeSlot("2026-06-01T09:00");
    const wednesdayAfternoon = makeSlot("2026-06-03T14:00");

    const result = groupSlotsByDay([mondayMorning, wednesdayAfternoon], week);

    expect(result[0]).toEqual([mondayMorning]);
    expect(result[2]).toEqual([wednesdayAfternoon]);
    expect(result[1]).toEqual([]);
  });

  it("sorts slots within a day by start time", () => {
    const later = makeSlot("2026-06-01T15:00");
    const earlier = makeSlot("2026-06-01T09:00");
    const middle = makeSlot("2026-06-01T12:00");

    const result = groupSlotsByDay([later, earlier, middle], week);

    expect(result[0]).toEqual([earlier, middle, later]);
  });

  it("ignores slots outside the displayed week", () => {
    const inWeek = makeSlot("2026-06-02T10:00");
    const beforeWeek = makeSlot("2026-05-30T10:00");
    const afterWeek = makeSlot("2026-06-10T10:00");

    const result = groupSlotsByDay([inWeek, beforeWeek, afterWeek], week);

    expect(result[1]).toEqual([inWeek]);
    expect(result.flat()).toEqual([inWeek]);
  });

  it("skips slots with invalid start strings", () => {
    const valid = makeSlot("2026-06-04T11:00");
    const broken = makeSlot("not-a-date");

    const result = groupSlotsByDay([valid, broken], week);

    expect(result[3]).toEqual([valid]);
    expect(result.flat()).toEqual([valid]);
  });
});
