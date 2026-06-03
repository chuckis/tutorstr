# Tutor Hub over Nostr — Agent Context

This repository contains a decentralized tutoring platform built on top of Nostr.

## Core idea
- Identity is based on Nostr keys (`npub`/`nsec`)
- No centralized user accounts
- Domain data is represented as Nostr events
- Frontend is a mobile-first PWA (`React + TypeScript`)
- Relay workspace exists, but custom relay server is not implemented yet

## Actual project status (June 2026)
- Frontend MVP is actively implemented in `frontend/`
- Main UI is a 4-tab shell: `Discover`, `Requests`, `Lessons`, `Profile`
- Request -> lesson agreement flow is implemented in frontend logic
- Encrypted direct messaging is enabled in active flows
- **Roles are live** (`tutor` / `student`); every `npub` is bound to exactly
  one role. Stored in the local vault only — no Nostr channel carries the
  role. See `docs/plans/role_separation_tutor_student.md` for the design
  notes, `docs/spec.md` §4 for the published model, and the
  `frontend/src/application/account/` layer for the guards / helpers.
- `relay/` currently contains placeholder scripts only

## Repository structure

`/frontend`
- React + TypeScript + Vite
- PWA-first UI
- All Nostr transport logic lives in hooks/services under `src/hooks` and `src/nostr`
- UI components must not directly talk to relays

`/relay`
- Placeholder workspace (no running relay server yet)

`/docs`
- `spec.md` — product spec
- `nostr-kinds.md` — custom kinds
- `plans/` — implementation plans and design specs

`/.github`
- CI workflows and templates

## Agents-first layer READMEs

Every architectural layer in `frontend/src/` has a root `README.md` written in agents-first style — concise, structured, dependency-aware. Designed for quick onboarding of both AI agents and developers.

| Layer | README | Purpose |
|-------|--------|---------|
| `domain/` | `domain/README.md` | Pure types, value objects, selectors |
| `ports/` | `ports/README.md` | Interface contracts (zero implementation) |
| `adapters/` | `adapters/README.md` | Port implementations (localStorage, Web Crypto, Nostr) |
| `application/` | `application/README.md` | Use cases, auth, role guards |
| `hooks/` | `hooks/README.md` | React orchestration hooks |
| `components/` | `components/README.md` | UI components and tab screens |
| `nostr/` | `nostr/README.md` | Nostr transport (client, config, kinds) |

Each README lists key files with a short purpose, layer-specific rules, and dependency direction. Use them as the entry point before reading individual files.

## Nostr event kinds in use

- `30000` — Profile (replaceable, tutor or student — see `docs/spec.md` §7.1)
- `30001` — Tutor Schedule (replaceable; tutor-only publish)
- `30002` — Booking Request (student-only publish)
- `30003` — Booking Status
- `30004` — Progress Log (encrypted)
- `30005` — Tutor Blog Post (reserved; tutor-only publish)
- `30006` — Lesson Agreement (replaceable/addressable via `d`)
- `4` — Encrypted direct messages (NIP-04)

The role is **not** published to Nostr in MVP. There is no `kind 30007`
Account event.

## Product behavior implemented
- Tutor publishes profile and schedule
- Student discovers tutors and published slots
- Student sends booking request for selected slot
- Tutor accepts/rejects request
- On accept, lesson agreement event is published (`30006`)
- Lesson appears for both tutor and student in `Lessons`
- Role-based actions in lesson details (complete/cancel/note)
- Encrypted chat available in tutor detail, request details, and lesson details
- Requests tab can show alert/highlight on new incoming request/message
- **Role-aware UI** (see "Roles" below):
  - `Requests` for students shows outgoing only (incoming segment is not
    rendered, no disabled buttons)
  - `Profile` for students has no `ScheduleForm`, no tutor metrics, no
    `subjects` / `hourlyRate` fields
  - `Discover` chat is read+write for students against the selected tutor;
    for tutors the chat area collapses and only tutor announcements from
    `kind 30005` are rendered (subscription itself is a separate task
    outside the role-split phases)
  - `useTutorSchedule` and `bookingsState.incoming` are no-ops / empty
    for students
  - `useAppNavigation` forces `requestSegment = "outgoing"` for students

## Coding rules
- TypeScript everywhere
- Prefer pure functions where practical
- No hardcoded relay URLs in UI components
- Keep UI logic and Nostr transport logic separated
- Follow docs in `docs/` and `docs/plans/`

## Roles (mandatory in new use-cases)

Every new use-case and hook that performs a role-restricted action **must
take an `AccountRole` argument and call `assertRole(actual, expected)`**
from `frontend/src/application/account/assertRole.ts` before doing any
side effect. The expected role is decided by the action, not by the caller.
Do not branch on `viewerRole` ad hoc in components to "make it work" — push
the guard into the use-case so the rule is testable.

Concrete rules for new code:

- `assertRole(viewerRole, "tutor")` for: `AcceptBooking`,
  `PublishTutorSchedule`, `ChangeLessonStatus` (for `completed` /
  `cancelled`), and the tutor branch of `CancelBooking`.
- `assertRole(viewerRole, "student")` for: `CreateBookingRequest` and
  the student branch of `CancelBooking`.
- `AccountRole` is exported from `frontend/src/domain/account.ts`. Vault
  reads / writes that touch `role` go through the `application/auth/`
  layer, never through `localStorage` directly.
- Hooks that take a role must default to `"tutor"` only for backward
  compatibility with the tutor-only legacy path; the controller in
  `useAppController` always passes the actual viewer role explicitly.
- Tests for any new role-gated use-case must cover both the happy role
  and the opposite role (must reject with `RoleMismatchError`).
- UI components that branch on role should take a `role: AccountRole` prop
  (and/or a derived `mode: "tutor" | "student"`), not read auth state
  directly. The role reaches the component from `useAppController` via
  `App.tsx`.

Do not introduce a new Nostr kind for the role (e.g. `kind 30007` Account).
The role stays in the vault by design — see `docs/spec.md` §4 and §4.6.

## Encryption
- Use NIP-04 or NIP-44 for private events
- Student progress logs are private by default
- Direct messages are encrypted (`kind 4`)
