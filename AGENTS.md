# Tutor Hub over Nostr — Agent Context

This repository contains a decentralized tutoring platform built on top of the Nostr protocol.

## Core idea
- Identity is based on Nostr keys (npub/nsec)
- No centralized user accounts
- All domain data is represented as Nostr events
- Backend is a custom relay with indexing and moderation
- Frontend is a React + TypeScript PWA

## Repository structure

/frontend
- React + TypeScript + Vite
- PWA-first
- All Nostr logic lives in src/nostr/
- UI components must not directly talk to relays

/relay
- Custom Nostr relay
- TypeScript
- WebSocket-based
- Responsible for indexing tutor profiles and schedules

/docs
- spec.md — MVP technical specification
- nostr-kinds.md — custom event kinds (NIP-style)

/.github
- Issue templates
- CI workflows

## Custom Nostr event kinds

30000 — Tutor Profile (replaceable)
30001 — Tutor Schedule (replaceable)
30002 — Booking Request
30003 — Booking Status
30004 — Student Progress Log (encrypted)
30005 — Tutor Blog Post

## Coding rules
- TypeScript everywhere
- Prefer pure functions
- No hardcoded relay URLs (use config)
- UI logic and Nostr logic must be separated
- Follow the MVP spec strictly

## Encryption
- Use NIP-04 or NIP-44 for private events
- Student progress logs are private by default
