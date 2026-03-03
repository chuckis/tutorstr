# Tutor Hub over Nostr — Agent Context

This repository contains a decentralized tutoring platform built on top of Nostr.

## Core idea
- Identity is based on Nostr keys (`npub`/`nsec`)
- No centralized user accounts
- Domain data is represented as Nostr events
- Frontend is a mobile-first PWA (`React + TypeScript`)
- Relay workspace exists, but custom relay server is not implemented yet

## Actual project status (March 2026)
- Frontend MVP is actively implemented in `frontend/`
- Main UI is a 4-tab shell: `Discover`, `Requests`, `Lessons`, `Profile`
- Request -> lesson agreement flow is implemented in frontend logic
- Encrypted direct messaging is enabled in active flows
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

## Nostr event kinds in use

- `30000` — Tutor Profile (replaceable)
- `30001` — Tutor Schedule (replaceable)
- `30002` — Booking Request
- `30003` — Booking Status
- `30004` — Student Progress Log (encrypted)
- `30005` — Tutor Blog Post (reserved)
- `30006` — Lesson Agreement (replaceable/addressable via `d`)
- `4` — Encrypted direct messages (NIP-04)

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

## Coding rules
- TypeScript everywhere
- Prefer pure functions where practical
- No hardcoded relay URLs in UI components
- Keep UI logic and Nostr transport logic separated
- Follow docs in `docs/` and `docs/plans/`

## Encryption
- Use NIP-04 or NIP-44 for private events
- Student progress logs are private by default
- Direct messages are encrypted (`kind 4`)
