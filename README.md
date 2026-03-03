# Tutorstr

Tutor Hub over Nostr: decentralized tutoring app where domain data lives in Nostr events.

## Current State (March 2026)

- Frontend MVP is active (`React + TypeScript + Vite`, PWA shell)
- Relay workspace exists but backend relay server is not implemented yet (`relay/` is placeholder scripts)
- Single keypair can act as both tutor and student depending on event context

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

Optional env for default relays:

- `VITE_NOSTR_RELAYS=wss://relay1.example,wss://relay2.example`

If not set, frontend uses defaults from `frontend/src/nostr/config.ts`.

## Specs

- `docs/spec.md`
- `docs/nostr-kinds.md`
- `docs/plans/pwa-layout-spec.md`
- `docs/plans/feature-lesson-agreement-dashboard.md`
- `docs/plans/design-spec.md`
