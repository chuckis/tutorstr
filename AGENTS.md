# Tutor Hub over Nostr — Agent Context

This repository contains a decentralized tutoring platform built on top of Nostr.

## Core idea
- Identity is based on Nostr keys (`npub`/`nsec`)
- No centralized user accounts
- Domain data is represented as Nostr events
- Frontend is a mobile-first PWA (`React + TypeScript`)
- Relay workspace exists, with a local dev relay (Khatru, in-memory)
- **Clean Architecture** with Ports & Adapters — domain and application layers have zero framework/IO dependencies

## Actual project status (June 2026)
- Frontend MVP is actively implemented in `frontend/`
- Main UI is a 4-tab shell: `Discover`, `Requests`, `Lessons`, `Profile`
- Request → lesson agreement flow is implemented in frontend logic
- Encrypted direct messaging is enabled in active flows (NIP-44 primary, NIP-04 legacy)
- Blog (`kind 30005`) is live — editor, drafts, post list, full CRUD via hooks/stores/repositories
- Moderation (NIP-51 mute lists, NIP-56 reports), reviews (`kind 32267`), and computed reputation scores are implemented
- Blossom media uploads (avatars, attachments), NIP-65 relay list metadata, and cross-relay sync (NIP-65 resolver) are in place
- Optimistic UI updates for reviews and booking actions; contextual hints system
- i18n with EN, RU, UK translations (14 domains each)
- PWA with service worker, manifest, and offline capability
- Multiple signer types: vault signer, NIP-07 (browser extension), NIP-46 (bunker remote), NIP-55 (Android native)
- **Roles are live** (`tutor` / `student`); every `npub` is bound to exactly
  one role. Stored in the local vault only — no Nostr channel carries the
  role. See `docs/plans/role_separation_tutor_student.md` for the design
  notes, `docs/spec.md` §4 for the published model, and the
  `frontend/src/application/account/` layer for the guards / helpers.
- `relay/` contains a functional local dev relay — Go + Khatru, in-memory, port 5555
- Test suite: 40 test files across domain, application/account, application/auth, application/usecases, and adapters/nostr, running via Vitest

## Repository structure

`/frontend`
- React + TypeScript + Vite
- PWA-first UI
- Clean Architecture with Ports & Adapters:
  - `domain/` — pure types, value objects, selectors
  - `ports/` — interface contracts (zero implementation)
  - `adapters/` — port implementations (localStorage, Web Crypto, Nostr, Blossom)
  - `application/` — use cases (>25 files), auth lifecycle, role guards
  - `hooks/` — React orchestration hooks
  - `components/` — UI components and tab screens
  - `nostr/` — Nostr transport utility (client, config, kinds); imported only by adapters
  - `stores/` — Zustand stores (blog, booking, lesson, message, profile, review, schedule)
  - `locales/` + `i18n/` — translation resources (EN, RU, UK)
  - `theme/` — ThemeProvider (light/dark toggle)
  - `utils/` — calendar, date/time, display, Nostr tags, notification cursor helpers
- UI components must not directly talk to relays

`/relay`
- Go + Khatru local dev relay, in-memory storage, port 5555
- Accepts all custom kinds (30000–30006, 32267), no persistence (dev only)

`/docs`
- `spec.md` — product spec
- `nostr-kinds.md` — custom kinds
- `plans/` — implementation plans and design specs (30+ files)
- `diagrams/` — Mermaid dependency map

`/.github`
- `ci.yml` — build-only CI (no test step yet)
- `pages.yml` — deploy to GitHub Pages

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

`nostr/` is a transport utility (client wrapper, config, `TutorHubKind` enum), not an architectural layer. It is imported only by `adapters/` and the composition root (`App.tsx`, `RepoContext.tsx`). See `nostr/README.md` for details.

Each README lists key files with a short purpose, layer-specific rules, and dependency direction. Use them as the entry point before reading individual files.

## Nostr event kinds in use

- `0` — Metadata / Profile (primary; `30000` is `@deprecated`, kept for backward compat)
- `4` — Encrypted direct messages (NIP-04 / NIP-44)
- `10000` — Mute List (NIP-51)
- `10002` — Relay List Metadata (NIP-65)
- `1984` — Report (NIP-56)
- `30000` — Profile (`@deprecated`, use `kind 0` instead)
- `30001` — Tutor Schedule (replaceable; tutor-only publish)
- `30002` — Booking Request (student-only publish)
- `30003` — Booking Status
- `30004` — Progress Log (encrypted)
- `30005` — Tutor Blog Post (tutor-only publish)
- `30006` — Lesson Agreement (replaceable/addressable via `d`)
- `32267` — Review (with rating)

The role is **not** published to Nostr in MVP. There is no `kind 30007` Account event.

## Product behavior implemented

**Core flow:**
- Tutor publishes profile and schedule
- Student discovers tutors and published slots
- Student sends booking request for selected slot
- Tutor accepts/rejects request
- On accept, lesson agreement event is published (`30006`)
- Lesson appears for both tutor and student in `Lessons`
- Role-based actions in lesson details (complete/cancel/note)
- Encrypted chat available in tutor detail, request details, and lesson details
- Requests tab can show alert/highlight on new incoming request/message

**Blog:**
- Tutor blog posts (`kind 30005`) — create, edit, publish, save drafts, view post list and full post
- Blog management UI in Profile tab (My Blog, Drafts)

**Moderation & reviews:**
- NIP-51 mute lists — publish mute/unmute, filter muted users
- NIP-56 reports (`kind 1984`) — report users with category and comment
- Reviews (`kind 32267`) — rate and review after a lesson
- Reputation scores computed from reviews

**Media & relays:**
- Blossom media uploads (avatar, lesson attachments) with ImageViewer
- NIP-65 relay list metadata (`kind 10002`) — configurable relay list in settings
- Cross-relay sync via NIP-65 resolver — find profiles across relays

**UI/UX:**
- Optimistic UI updates for reviews, booking accept/reject
- Contextual hints system (help popovers)
- Full i18n: English, Russian, Ukrainian (14 domains each)
- PWA: service worker, manifest, icons, offline capability
- Light/dark theme toggle

**Signer support:**
- Local vault signer (passphrase-encrypted nsec)
- NIP-07 (browser extension, e.g. Alby)
- NIP-46 (bunker remote signer)
- NIP-55 (Amber / Nowser on Android)

**Role-aware UI** (see "Roles" below):
- `Requests` for students shows outgoing only (incoming segment is not rendered, no disabled buttons)
- `Profile` for students has no `ScheduleForm`, no tutor metrics, no `subjects` / `hourlyRate` fields
- `Discover` chat is read+write for students against the selected tutor; for tutors the chat area collapses and only tutor announcements from `kind 30005` are rendered
- `useTutorSchedule` and `bookingsState.incoming` are no-ops / empty for students
- `useAppNavigation` forces `requestSegment = "outgoing"` for students

## Coding rules
- TypeScript everywhere
- Prefer pure functions where practical
- No hardcoded relay URLs in UI components
- Keep UI logic and Nostr transport logic separated
- Follow docs in `docs/` and `docs/plans/`
- Tests use Vitest (~40 files); pure domain and application logic is tested without mocks; adapter tests use minimal mocking
- CI runs `npm run build` only (no test step in `ci.yml` yet)

## Roles (mandatory in new use-cases)

Every new use-case and hook that performs a role-restricted action **must take an `AccountRole` argument and call `assertRole(actual, expected)`** from `frontend/src/application/account/assertRole.ts` before doing any side effect. The expected role is decided by the action, not by the caller. Do not branch on `viewerRole` ad hoc in components to "make it work" — push the guard into the use-case so the rule is testable.

Concrete rules for new code:

- `assertRole(viewerRole, "tutor")` for: `AcceptBooking`, `PublishTutorSchedule`, `ChangeLessonStatus` (for `completed` / `cancelled`), and the tutor branch of `CancelBooking`.
- `assertRole(viewerRole, "student")` for: `CreateBookingRequest` and the student branch of `CancelBooking`.
- `AccountRole` is exported from `frontend/src/domain/account.ts`. Vault reads / writes that touch `role` go through the `application/auth/` layer, never through `localStorage` directly.
- Hooks that take a role must default to `"tutor"` only for backward compatibility with the tutor-only legacy path; the controller in `useAppController` always passes the actual viewer role explicitly.
- Tests for any new role-gated use-case must cover both the happy role and the opposite role (must reject with `RoleMismatchError`).
- UI components that branch on role should take a `role: AccountRole` prop (and/or a derived `mode: "tutor" | "student"`), not read auth state directly. The role reaches the component from `useAppController` via `App.tsx`.

Do not introduce a new Nostr kind for the role (e.g. `kind 30007` Account). The role stays in the vault by design — see `docs/spec.md` §4 and §4.6.

## Encryption
- NIP-44 is the primary encryption scheme (NIP-44 conversation keys); NIP-04 is supported as a legacy fallback
- Student progress logs (`kind 30004`) are encrypted by default
- Direct messages (`kind 4`) are encrypted using NIP-04 / NIP-44
- Lesson notes can be encrypted-published to self and optionally shared encrypted with counterparty
