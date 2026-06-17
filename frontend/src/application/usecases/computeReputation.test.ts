import { describe, expect, it } from "vitest";
import { computeReputation } from "./computeReputation";
import { Review } from "../../domain/review";

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "r1",
    authorPubkey: "author-1",
    subjectPubkey: "subject-1",
    lessonId: "lesson-1",
    lessonEventId: "event-1",
    role: "student",
    rating: 5,
    comment: "Great!",
    createdAt: 1000,
    ...overrides,
  };
}

describe("computeReputation", () => {
  it("returns zero values for an empty review list", () => {
    const result = computeReputation("subject-1", [], 10);
    expect(result).toEqual({
      subjectPubkey: "subject-1",
      averageRating: 0,
      reviewCount: 0,
      completedLessonsCount: 10,
    });
  });

  it("computes average for a single review", () => {
    const reviews = [makeReview({ rating: 4 })];
    const result = computeReputation("subject-1", reviews, 5);
    expect(result.averageRating).toBe(4);
    expect(result.reviewCount).toBe(1);
    expect(result.completedLessonsCount).toBe(5);
  });

  it("rounds average to one decimal place", () => {
    const reviews = [
      makeReview({ rating: 4 }),
      makeReview({ rating: 5 }),
      makeReview({ rating: 4 }),
    ];
    const result = computeReputation("subject-1", reviews, 3);
    expect(result.averageRating).toBe(4.3);
    expect(result.reviewCount).toBe(3);
  });

  it("filters reviews by subjectPubkey when used externally", () => {
    const reviews = [
      makeReview({ subjectPubkey: "subject-1", rating: 5 }),
      makeReview({ subjectPubkey: "subject-2", rating: 1 }),
    ];
    const result = computeReputation("subject-1", reviews, 7);
    expect(result.averageRating).toBe(3);
    expect(result.reviewCount).toBe(2);
  });
});
