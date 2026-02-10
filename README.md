# Tutorstr

Tutor Hub over Nostr — a decentralized tutoring platform built on Nostr events.

## Status

MVP in progress. Frontend uses React + TypeScript + Vite with PWA basics.

## Features (Implemented)

- Tutor profile publishing (kind `30000`)
- Tutor schedule publishing (kind `30001`)
- Tutor directory with subject filter
- Booking requests (kind `30002`) + booking status (kind `30003`)
- Private messaging (kind `4`, NIP-04)
- Encrypted progress logs (kind `30004`, NIP-04)

## Repository

- `frontend/` React app (Vite)
- `relay/` Relay service (placeholder)
- `docs/` Specs and Nostr kind definitions

## Quickstart

```bash
npm install
npm run dev
```

Set relays via `VITE_NOSTR_RELAYS` (comma-separated) before running `npm run dev`.

## Specs

- `docs/spec.md`
- `docs/nostr-kinds.md`
