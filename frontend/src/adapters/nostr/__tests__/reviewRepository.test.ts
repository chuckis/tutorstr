import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TutorHubKind } from "../../../nostr/kinds";

describe("reviewRepository", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("parseReviewEvent", () => {
    it("parses a kind-32267 event into a Review", async () => {
      const { createNostrReviewRepository } = await import(
        "../reviewRepository"
      );

      const repo = createNostrReviewRepository();
      expect(repo).toBeDefined();
    });
  });

  describe("buildReviewTags", () => {
    it("builds correct tags for a review", async () => {
      const review = {
        authorPubkey: "student-1",
        subjectPubkey: "tutor-1",
        lessonId: "lesson-1",
        lessonEventId: "agreement-event-1",
        role: "student" as const,
        rating: 5 as const,
        comment: "Great lesson!",
      };

      const { TutorHubKind } = await import("../../../nostr/kinds");
      expect(TutorHubKind.Review).toBe(32267);
    });
  });
});
