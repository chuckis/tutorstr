# Application Use Cases

Application-level orchestration and view-model builders. Each use case depends on domain types and ports; relay/Nostr details stay in adapters and hooks.

## Booking & Lesson lifecycle

| File | Purpose |
|------|---------|
| `acceptBooking.ts` | Accept one pending booking, create lesson, reject competing bookings |
| `cancelBooking.ts` | Role-gated cancellation — tutor and student branches |
| `changeLessonStatus.ts` | Tutor completes or cancels a lesson |
| `createAcceptedLessonFactory.ts` | Build lesson objects from accepted bookings with fallback defaults |
| `createBookingRequest.ts` | Student creates a booking request for a slot |

## Blog

| File | Purpose |
|------|---------|
| `deleteBlogPost.ts` | Delete a blog post (publish deletion-request event) |
| `getMyDrafts.ts` | Fetch own drafts from draft repository |
| `getTutorBlog.ts` | Fetch published blog posts for a given tutor |
| `publishBlogPost.ts` | Publish a blog post with optimistic store update |
| `saveDraft.ts` | Save a blog draft locally |

## Moderation & Reviews

| File | Purpose |
|------|---------|
| `publishMuteList.ts` | Publish NIP-51 mute list |
| `publishReport.ts` | Publish NIP-56 report |
| `publishReview.ts` | Publish a lesson review (kind 32267) |
| `computeReputation.ts` | Compute reputation summary (average rating + count) from reviews |

## Schedule

| File | Purpose |
|------|---------|
| `publishTutorSchedule.ts` | Tutor publishes their schedule (kind 30001) |
| `buildWeekDays.ts` | Build week-day list from schedule for display |
| `getWeekRangeLabel.ts` | Week range label for schedule UI |
| `groupSlotsByDay.ts` | Group time slots by day of week |
| `isSameLocalDay.ts` | Compare two timestamps in local timezone |

## View Model builders

| File | Purpose |
|------|---------|
| `buildRequestsTabViewModel.ts` | Convert booking data into Requests tab view model (grouping, labels, unread counts, actions) |
| `groupLessonsByTimeline.ts` | Split lessons into upcoming and past buckets for the Lessons tab |

## Lesson Notes

| File | Purpose |
|------|---------|
| `sendLessonNote.ts` | Role-gated publish of a lesson note as encrypted backup to self |
| `shareLessonNote.ts` | Role-gated share of a lesson note with the counterparty |

## Relay

| File | Purpose |
|------|---------|
| `publishRelayList.ts` | Publish NIP-65 relay list metadata event |
