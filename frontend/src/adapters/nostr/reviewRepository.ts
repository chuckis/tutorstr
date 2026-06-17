import { Review, ReviewAuthorRole, ReviewRating } from "../../domain/review";
import { ReviewRepository } from "../../ports/reviewRepository";
import { TutorHubKind } from "../../nostr/kinds";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";
import { getTagValue } from "../../utils/nostrTags";

function parseReviewEvent(event: {
  id: string;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}): Review {
  const rating = parseInt(getTagValue(event.tags, "rating") || "0", 10) as ReviewRating;
  const role = getTagValue(event.tags, "role") as ReviewAuthorRole;

  return {
    id: event.id,
    authorPubkey: event.pubkey,
    subjectPubkey: getTagValue(event.tags, "p") || "",
    lessonId: getTagValue(event.tags, "d") || event.id,
    lessonEventId: getTagValue(event.tags, "e") || "",
    role: role || "student",
    rating,
    comment: event.content,
    createdAt: event.created_at,
  };
}

function buildReviewTags(review: Omit<Review, "id" | "createdAt">): string[][] {
  const tags: string[][] = [
    ["p", review.subjectPubkey],
    ["d", review.lessonId],
    ["rating", String(review.rating)],
    ["role", review.role],
  ];
  if (review.lessonEventId) {
    tags.splice(1, 0, ["e", review.lessonEventId]);
  }
  return tags;
}

export function createNostrReviewRepository(): ReviewRepository {
  return {
    subscribeReviewsForSubject(subjectPubkey, onReview) {
      return addKindListener(TutorHubKind.Review, (event) => {
        const p = getTagValue(event.tags, "p");
        if (p !== subjectPubkey) return;
        try {
          onReview(parseReviewEvent(event));
        } catch {
          // ignore malformed events
        }
      });
    },

    async getReviewByAuthorAndLesson(authorPubkey, lessonId) {
      return new Promise<Review | null>((resolve) => {
        let resolved = false;
        const unsub = nostrClient.subscribe(
          {
            kinds: [TutorHubKind.Review],
            authors: [authorPubkey],
            "#d": [lessonId],
            limit: 1,
          },
          (event) => {
            if (resolved) return;
            resolved = true;
            unsub();
            try {
              resolve(parseReviewEvent(event));
            } catch {
              resolve(null);
            }
          },
          { onEose: () => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          }}
        );
      });
    },

    async publishReview(review) {
      const event = await nostrClient.publishReplaceableEvent(
        TutorHubKind.Review,
        review.comment,
        buildReviewTags(review)
      );
      return event.id;
    },
  };
}
