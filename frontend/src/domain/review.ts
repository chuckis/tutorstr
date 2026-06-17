export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type ReviewAuthorRole = "student" | "tutor";

export type Review = {
  id: string;
  authorPubkey: string;
  subjectPubkey: string;
  lessonId: string;
  lessonEventId: string;
  role: ReviewAuthorRole;
  rating: ReviewRating;
  comment: string;
  createdAt: number;
};

export type ReputationSummary = {
  subjectPubkey: string;
  averageRating: number;
  reviewCount: number;
  completedLessonsCount: number;
};
