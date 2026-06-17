export enum TutorHubKind {
  Metadata = 0,
  /** @deprecated Use Metadata (kind 0) instead. Kept for backward compat. */
  Profile = 30000,
  TutorSchedule = 30001,
  BookingRequest = 30002,
  BookingStatus = 30003,
  StudentProgress = 30004,
  TutorBlogPost = 30005,
  LessonAgreement = 30006,
  Review = 32267,
  DirectMessage = 4,
}
