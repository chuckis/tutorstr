# Application — Use Cases, Auth, Role Guards

Business workflows, identity management, and role enforcement. Depends on `domain/` and `ports/`; no React dependency.

## Directories

### `usecases/` — Business workflows

See [`usecases/README.md`](./usecases/README.md) for full list. Key workflows:

- `acceptBooking.ts` — Tutor accepts booking, creates lesson, rejects competitors
- `createBookingRequest.ts` — Student creates a booking request
- `cancelBooking.ts` — Role-gated cancellation (tutor and student branches)
- `changeLessonStatus.ts` — Tutor completes/cancels lesson
- `publishTutorSchedule.ts` — Tutor publishes schedule event
- `sendLessonNote.ts` — Publish own lesson note as encrypted backup (role-gated)
- `shareLessonNote.ts` — Share lesson note with counterparty (role-gated)
- `publishBlogPost.ts`, `saveDraft.ts`, `deleteBlogPost.ts`, `getMyDrafts.ts`, `getTutorBlog.ts` — Blog CRUD
- `publishMuteList.ts`, `publishReport.ts`, `publishReview.ts` — Moderation & reviews
- `buildRequestsTabViewModel.ts`, `groupLessonsByTimeline.ts`, `groupSlotsByDay.ts` — View model builders

### `auth/` — Identity lifecycle

- `createNewProfile.ts`, `importExistingKey.ts`, `unlockVault.ts`
- `restoreStoredSession.ts`, `saveGeneratedProfile.ts`, `saveNip07Session.ts`
- `exportSecretKey.ts`, `logout.ts`, `parseBunkerInput.ts`

### `account/` — Role enforcement

- `assertRole.ts` — Guards all role-restricted actions
- `requestSegment.ts` — Forces `"outgoing"` for students

### `locale/`

- `detectLocale.ts` — Browser locale detection

## Rules

- Every role-restricted use case calls `assertRole()` before side effects
- No React imports; no localStorage access
- Depends on `domain/` and `ports/` only
