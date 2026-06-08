# Tutorstr

Tutor Hub over Nostr: decentralized tutoring app where domain data lives in Nostr events.

## Current State (June 2026)

- Frontend MVP is active (`React + TypeScript + Vite`, PWA shell)
- Relay workspace exists with custom Nostr relay server implementation in [THR](https://github.com/tutor-hub-2030/thr) submodule
- **Roles are live** — every npub is bound to exactly one role (`tutor` / `student`). Stored in the local vault only — no Nostr channel carries the role. See `docs/plans/role_separation_tutor_student.md` for design notes.
- Lesson notes with visibility chips (`saved` / `published` / `shared`) — notes list and detail views accessible from lesson detail
- `App.tsx` is a thin shell/controller composition layer
- Frontend refactor is in progress to decouple business logic from raw Nostr event structures

## Implemented Features

- Mobile-first PWA layout with 4 tabs:
  - `Discover`
  - `Requests`
  - `Lessons`
  - `Profile`
- Tutor profile publishing (`kind 30000`, replaceable)
- Tutor schedule publishing (`kind 30001`, replaceable)
- Tutor discovery with subject filter and tutor detail view
- Booking requests (`kind 30002`) and booking statuses (`kind 30003`)
- Lesson agreements (`kind 30006`, addressable/replaceable by `d` tag)
- Lesson status updates (`scheduled` → `completed` / `cancelled`)
- Encrypted private messages (`kind 4`, NIP-04) in tutor/request/lesson detail flows
- Encrypted progress entries (`kind 30004`, NIP-04)
- **Lesson notes** — inline editor with Save / Publish / Share actions, notes list with visibility chips, note detail view
- Requests tab alert badge/highlight when new incoming request or message appears
- Relay configuration in Profile tab (persisted in localStorage)

## Roles

Every npub is bound to exactly one role (`tutor` or `student`), stored in the local vault. The role is never published to Nostr in MVP.

Role-aware UI behaviour:
- `Requests`: students see outgoing only (incoming segment is hidden)
- `Profile`: students have no ScheduleForm, no tutor metrics, no `subjects` / `hourlyRate` fields
- `Discover`: student chat is read+write; for tutors the chat area collapses
- `useTutorSchedule` and `bookingsState.incoming` are no-ops / empty for students
- `useAppNavigation` forces `requestSegment = "outgoing"` for students

Every new role-gated use-case calls `assertRole()` from `application/account/assertRole.ts` before side effects.

See `docs/plans/role_separation_tutor_student.md` and `docs/spec.md` §4 for details.

## Frontend Architecture

The frontend is moving toward a layered structure where Nostr is an implementation detail instead of the default shape of app logic.

- `frontend/src/domain/` — pure domain models (`Booking`, `Lesson`, `LessonNote`, etc.)
- `frontend/src/ports/` — repository interfaces (abstract contracts)
- `frontend/src/adapters/` — port implementations (localStorage, Web Crypto, Nostr)
- `frontend/src/application/` — use cases, auth, role guards
- `frontend/src/hooks/` — React orchestration hooks
- `frontend/src/components/` — presentation components and tab screens

Each layer directory has an agents-first README with key files and rules.

> Dependency map: [`docs/diagrams/actual-dependency-map.mmd`](docs/diagrams/actual-dependency-map.mmd) — visual overview of module dependencies and current violations.
> Regenerate locally before pushing: `npm run depmap`

## Nostr Kinds Used

- `30000` Tutor Profile
- `30001` Tutor Schedule
- `30002` Booking Request
- `30003` Booking Status
- `30004` Student Progress Log / Lesson Note (encrypted, discriminated by JSON `type` field)
- `30005` Tutor Blog Post (reserved)
- `30006` Lesson Agreement
- `4` Private Direct Message (encrypted)

## Repository Structure

- `frontend/` main app (implemented)
- `relay/` submodule pointing to [THR](https://github.com/tutor-hub-2030/thr) — custom Nostr relay for Tutor Hub
- `docs/` specifications and event kind docs

## Run Locally

From repository root:

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run preview
npm run test
```

Workspace equivalents:

```bash
npm --workspace frontend run dev
npm --workspace frontend run build
npm --workspace frontend run preview
```

Notes:
- Root `npm run dev` / `build` / `preview` proxy to the `frontend` workspace
- `npm run test` runs all tests via vitest

Optional env for default relays:

- `VITE_NOSTR_RELAYS=wss://relay1.example,wss://relay2.example`

If not set, frontend uses defaults from `frontend/src/nostr/config.ts`.
