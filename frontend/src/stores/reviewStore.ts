import { create } from "zustand";
import { Review } from "../domain/review";

interface ReviewState {
  bySubject: Record<string, Review[]>;
  setReviews: (subjectPubkey: string, reviews: Review[]) => void;
  addReview: (subjectPubkey: string, review: Review) => void;
  removeReview: (subjectPubkey: string, reviewId: string) => void;
  snapshotReviews: (subjectPubkey: string) => Review[] | undefined;
  restoreReviews: (subjectPubkey: string, snapshot: Review[] | undefined) => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  bySubject: {},

  setReviews(subjectPubkey, reviews) {
    set((s) => ({
      bySubject: { ...s.bySubject, [subjectPubkey]: reviews },
    }));
  },

  addReview(subjectPubkey, review) {
    set((s) => {
      const existing = s.bySubject[subjectPubkey] ?? [];
      const alreadyStored = existing.some((r) => r.id === review.id);
      if (alreadyStored) return s;
      return {
        bySubject: {
          ...s.bySubject,
          [subjectPubkey]: [...existing, review],
        },
      };
    });
  },

  removeReview(subjectPubkey, reviewId) {
    set((s) => {
      const existing = s.bySubject[subjectPubkey] ?? [];
      return {
        bySubject: {
          ...s.bySubject,
          [subjectPubkey]: existing.filter((r) => r.id !== reviewId),
        },
      };
    });
  },

  snapshotReviews(subjectPubkey) {
    const reviews = get().bySubject[subjectPubkey];
    return reviews ? [...reviews] : undefined;
  },

  restoreReviews(subjectPubkey, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.bySubject };
        delete next[subjectPubkey];
        return { bySubject: next };
      });
      return;
    }
    set((s) => ({
      bySubject: { ...s.bySubject, [subjectPubkey]: snapshot },
    }));
  },
}));
