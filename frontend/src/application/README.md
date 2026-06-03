# Application — Use Cases, Auth, Role Guards

Business workflows, identity management, and role enforcement. Depends on `domain/` and `ports/`; no React dependency.

## Directories

### `usecases/` — Business workflows
See [`usecases/README.md`](./usecases/README.md) for details. Key files:

- `acceptBooking.ts` — Tutor accepts booking, creates lesson, rejects competitors
- `createBookingRequest.ts` — Student creates a booking request
- `cancelBooking.ts` — Role-gated cancellation
- `changeLessonStatus.ts` — Tutor completes/cancels lesson
- `publishTutorSchedule.ts` — Tutor publishes schedule event
- `buildRequestsTabViewModel.ts` — Requests tab view model

### `auth/` — Identity lifecycle
- `createNewProfile.ts`, `importExistingKey.ts`, `unlockVault.ts`
- `restoreStoredSession.ts`, `saveGeneratedProfile.ts`
- `exportSecretKey.ts`, `logout.ts`

### `account/` — Role enforcement
- `assertRole.ts` — Guards all role-restricted actions
- `requestSegment.ts` — Forces `"outgoing"` for students

### `locale/`
- `detectLocale.ts` — Browser locale detection

## Rules

- Every role-restricted use case calls `assertRole()` before side effects
- No React imports; no localStorage access
- Depends on `domain/` and `ports/` only
