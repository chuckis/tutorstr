# Changelog

All notable changes to Tutorstr are recorded here. Dates are ISO 8601 (YYYY-MM-DD).

The format is loose `Keep a Changelog`-style: `Added`, `Changed`, `Removed`,
`Fixed`, plus a `Notes` block for cross-cutting items that need a paragraph.

## [Unreleased] — 2026-06-02

### Added
- **Account roles** (`tutor` / `student`) with 1:1 binding to `npub`. Every
  `npub` is exactly one role in MVP; multi-role and role switching are
  out of scope.
- **Role-pick step in the create onboarding flow.** New users see a
  two-card radio (tutor / student) with short descriptions before the
  `nsec` reveal. The import flow does not show this step.
- **`AccountRole`** type and `assertRole(actual, expected)` guard in
  `frontend/src/application/account/`. New role-gated use-cases must
  call it before any side effect.
- **Role-gated use-cases** in `frontend/src/application/usecases/`:
  - `AcceptBooking` (tutor)
  - `CreateBookingRequest` (student)
  - `CancelBooking` (tutor cancels `accepted`; student cancels `pending`)
  - `ChangeLessonStatus` (tutor for `completed` / `cancelled`)
  - `PublishTutorSchedule` (tutor)
- **`useAppNavigation(role)`** — for students, `requestSegment` is forced
  to `"outgoing"`; `setRequestSegment` cannot flip it back.
- **`useMessageIndicators(..., role)`** — for students, `requestUnreadCount`
  only counts outgoing thread keys.
- **`useTutorSchedule(pubkey, role)`** — for students, the `kind 30001`
  subscription is not started and `publishSchedule` is a no-op.
- **Role-aware UI:**
  - `RequestsTab` — for students the segmented control is **not rendered**
    (no disabled buttons); only the outgoing list is shown.
  - `ProfileForm` — accepts a `mode: "tutor" | "student"` prop; the
    student mode hides `subjects` and `hourlyRate` fields.
  - `DashboardTab` — for students, no `ScheduleForm`, no tutor metrics;
    shows bio plus a "My upcoming lessons" preview (up to 3 cards from
    `lessonsState.lessonBuckets.upcoming`).
  - `DiscoverTab` — for students, the selected-tutor view shows a full
    chat (read + write) plus `BookingRequestForm`; for tutors, it shows
    read-only `tutorAnnouncements` from `kind 30005` (the actual
    `kind 30005` subscription is a separate task outside this MVP).
- **i18n keys** for the new flows in all three locales
  (`en` / `ru` / `uk`): `profile.student.*`, `requests.student.*`,
  `discover.studentChat`, `discover.tutorAnnouncements`. Existing
  `requests.student` (counterparty label) was renamed to
  `requests.partyRole.student` to make room for the nested
  `requests.student.*` block.
- **Unit tests** for the new use-cases and helpers, including
  role-mismatch cases.

### Changed
- `App.tsx` now passes `viewerRole` to `useAppController` and to
  `DashboardTab`, `DashboardSettingsDrawer`, `DiscoverTab`, and
  `RequestsTab`.
- `useAppController` filters `bookingsState.incoming` to `[]` for students
  and pipes `viewerRole` into the dependent hooks.
- `kind 30000` (Profile) is now documented as shared between tutors and
  students; the tutor-only fields (`subjects`, `hourlyRate`) are
  documented as optional. See `docs/spec.md` §7.1.
- `docs/spec.md` §4 rewritten under the new role model (1:1 binding,
  vault-only storage, permission matrix, onboarding flow, out-of-scope
  list). See `docs/spec.md` §4.4–4.6.
- `AGENTS.md` adds a "Roles (mandatory in new use-cases)" rule that
  future agents must follow.

### Notes
- The role is **not** published to Nostr. There is no `kind 30007`
  Account event. The vault is the only source of truth.
- Legacy import: an `nsec` imported into a "clean" vault falls back to
  `role = "tutor"`. This is safe in MVP because no production account is
  a student yet. Cross-client student role recovery is a separate
  onboarding task outside this MVP.
- Phases 0–5 of the `role_separation_tutor_student` plan are now closed;
  see `docs/plans/role_separation_tutor_student.md` for the design
  notes and the phase breakdown.
