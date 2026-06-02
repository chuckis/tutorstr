import { describe, expect, it } from "vitest";
import { effectiveRequestSegment } from "./requestSegment";

describe("effectiveRequestSegment", () => {
  it("forces outgoing for students regardless of stored segment", () => {
    expect(effectiveRequestSegment("student", "incoming")).toBe("outgoing");
    expect(effectiveRequestSegment("student", "outgoing")).toBe("outgoing");
  });

  it("returns the current segment for tutors", () => {
    expect(effectiveRequestSegment("tutor", "incoming")).toBe("incoming");
    expect(effectiveRequestSegment("tutor", "outgoing")).toBe("outgoing");
  });
});
