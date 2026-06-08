# Application Use Cases

This folder contains application-level orchestration and view-model builders.
Use cases depend on domain types and ports, while relay/Nostr details stay in
adapters and hooks.

- `acceptBooking.ts` accepts one pending booking for a slot, creates the lesson,
  and rejects other active competing bookings when the slot is filled.
- `buildRequestsTabViewModel.ts` converts booking data into the Requests tab
  view model, including grouping, labels, unread counts, and available actions.
- `cancelBooking.ts` role-gated cancellation — tutor branch and student branch.
- `changeLessonStatus.ts` tutor completes or cancels a lesson.
- `createAcceptedLessonFactory.ts` builds lesson objects from accepted bookings,
  deriving duration from the requested slot and applying fallback defaults.
- `createBookingRequest.ts` student creates a booking request for a slot.
- `groupLessonsByTimeline.ts` splits lessons into upcoming and past buckets for
  the Lessons tab.
- `publishTutorSchedule.ts` tutor publishes their schedule.
- `sendLessonNote.ts` role-gated publish of a lesson note as encrypted backup to self.
- `shareLessonNote.ts` role-gated share of a lesson note with the counterparty.
