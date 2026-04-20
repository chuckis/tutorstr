# Tutorstr

Tutor Hub over Nostr: decentralized tutoring app where domain data lives in Nostr events.

## Current State (April 2026)

- Frontend MVP is active (`React + TypeScript + Vite`, PWA shell)
- Relay workspace exists but backend relay server is not implemented yet (`relay/` is placeholder scripts)
- Single keypair can act as both tutor and student depending on event context
- `App.tsx` has been reduced to a thin shell/controller composition layer
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
- Lesson status updates (`scheduled -> completed/cancelled`)
- Local personal lesson notes (`lesson-note:<lessonId>:<viewerPubkey>`)
- Encrypted private messages (`kind 4`, NIP-04) in tutor/request/lesson detail flows
- Encrypted progress entries (`kind 30004`, NIP-04)
- Requests tab alert badge/highlight when new incoming request or message appears
- Relay configuration in Profile tab (persisted in localStorage)

## Frontend Architecture

The frontend is moving toward a layered structure where Nostr is an implementation detail instead of the default shape of app logic.

- `frontend/src/domain/` domain models such as `Booking` and `Lesson`
- `frontend/src/ports/` repository interfaces for booking and lesson access
- `frontend/src/adapters/nostr/` mapping between raw Nostr events and domain models
- `frontend/src/application/usecases/` business use cases such as `AcceptBooking`
- `frontend/src/hooks/` orchestration and UI-facing hooks (`useBookings`, `useLessons`, `useAppController`, etc.)
- `frontend/src/components/` presentation components and tab screens

This refactor is incremental: legacy Nostr hooks still exist, but new UI paths are being migrated onto domain-oriented hooks.

## Nostr Kinds Used

- `30000` Tutor Profile
- `30001` Tutor Schedule
- `30002` Booking Request
- `30003` Booking Status
- `30004` Student Progress Log (encrypted)
- `30005` Tutor Blog Post (reserved)
- `30006` Lesson Agreement
- `4` Private Direct Message (encrypted)

## Repository Structure

- `frontend/` main app (implemented)
- `relay/` relay workspace placeholder (not yet implemented)
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
- `npm run test` currently prints `no tests yet`

Optional env for default relays:

- `VITE_NOSTR_RELAYS=wss://relay1.example,wss://relay2.example`

If not set, frontend uses defaults from `frontend/src/nostr/config.ts`.

## Specs

- `docs/spec.md`
- `docs/nostr-kinds.md`
- `docs/plans/pwa-layout-spec.md`
- `docs/plans/feature-lesson-agreement-dashboard.md`
- `docs/plans/design-spec.md`
- `docs/plans/decoupling-BL.md`
