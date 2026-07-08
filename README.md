# TutorHub

TutorHub is a **decentralised tutoring platform** built on Nostr. There is no central server — identity is key-based (npub/nsec), domain data lives in Nostr events, and users interact through relays. The frontend is a mobile-first PWA (React + TypeScript + Vite) with Clean Architecture (Ports & Adapters). The `master` branch also includes an **AI homework review assistant** and a full local dev stack (Nostr relay + Blossom media server).

---

## Quick Start

```bash
npm install
npm run dev          # starts Vite (port 5173) + Khatru relay (port 5555) + Blossom server
```

**Prerequisites:** Node.js >= 22, Go >= 1.24, npm >= 10.

| Env var | Default (dev) | Description |
|---------|---------------|-------------|
| `VITE_NOSTR_RELAYS` | `ws://localhost:5555` | Comma-separated relay URLs |
| `VITE_DEBUG_NOSTR` | — | Set `"true"` for verbose Nostr logging |

---

## Tests

```bash
npm test             # vitest run (40 test files across domain, application, adapters)
```

---

## Pre-push Checks

- `npm run build` — must pass (CI runs the same)
- `npm test` — all tests green
- **Dependency diagram** (`docs/diagrams/actual-dependency-map.mmd`) must be up to date — regenerate with `npm run depmap`
- No hardcoded relay URLs in UI components
- New use-cases that are role-restricted **must** call `assertRole()` from `application/account/assertRole.ts`

---

## Architecture Overview

```
frontend/src/
  domain/        — pure domain types/value objects (zero deps)
  ports/         — interface contracts (zero implementations)
  adapters/      — implementations (localStorage, Web Crypto, Nostr, Blossom)
  application/   — use-cases, auth lifecycle, role guards
  hooks/         — React orchestration hooks
  components/    — UI components and tab screens
  stores/        — Zustand stores (booking, lesson, message, profile, blog, review, schedule)
  nostr/         — Nostr transport client (imported only by adapters)
  i18n/          — EN / RU / UK translations
  utils/         — pure helpers (calendar, tags, display)
```

See `docs/diagrams/actual-dependency-map.mmd` for the full dependency graph (generated via `npm run depmap`).

### Key Libraries & Services

| Library / Service | Role |
|-------------------|------|
| **nostr-tools v2** | Nostr protocol: pool, filters, NIP-44 encryption |
| **Zustand** | Client-side state (event bus, booking, lesson, message, profile, blog, review, schedule) |
| **MDXEditor** | Blog post editor (rich text / markdown) |
| **Khatru** (Go) | Local dev relay (in-memory, port 5555, accepts all custom kinds) |
| **Blossom** (Go) | Local media server for avatar/attachment uploads |
| **SimplePool** | Long-lived global Nostr subscription + per-user subscriptions |
| **eventBus** (Zustand) | In-memory event buffer with replay via `addKindListener` |

### External APIs (Nostr — no central API)

All data is fetched from Nostr relays. There is **no REST API, no database**. The local dev relay (Khatru) replaces public relays during development.

### Signers (Identity)

- **Vault signer** — passphrase-encrypted nsec in localStorage
- **NIP-07** — browser extension (Alby)
- **NIP-46** — bunker remote signer
- **NIP-55** — Android native (Amber / Nowser)

### Mocks

The dev relay is a full in-memory implementation — no external relay is needed. No other services are mocked in tests: domain and application tests are pure logic (no mocks); adapter tests use minimal mocking. Tests do **not** spin up a relay.

---

## Vintage / Notable Quirks

- **`kind 30000` Profile** is deprecated but kept for backward compat — use `kind 0` instead
- **Role** is stored in local vault only, never published to Nostr (no `kind 30007`)
- **Optimistic UI** is used for reviews and booking accept/reject — the store updates immediately, then the relay event is the source of truth
- **Lesson notes** (`kind 30004`) are encrypted; the `type` JSON field discriminates between progress logs and lesson notes
- **`pool.subscribeMap`** is used instead of `subscribeMany` — nostr-tools v2's `subscribeMany` wraps filters in an extra array, producing invalid REQ messages
- **EventBus replay** (`addKindListener`) replays all buffered events on listener registration — this is intentional (ADR-004), prevents event loss during async subscription setup

---

## Demo

The `demo` branch is deployed as a PWA demo on GitHub Pages (`.github/workflows/pages.yml`).

### Additional services in `master`

| Service | Dir | What it does |
|---------|-----|-------------|
| **AI Assistant** | `ai-assistant/` | Standalone TypeScript bot that reviews homework submissions via OpenRouter (LLM). Subscribes to encrypted DMs (`kind 4`), runs a ticket-based state machine (`PENDING_REVIEW → APPROVED_BY_AI → ESCALATED_TO_TUTOR`), supports multi-model fallback and image analysis. Run with `npm run dev:ai`. |
| **Blossom server** | `relay/cmd/blossom/` | HTTP media server (BUD-01/02/12, NIP-96) for avatar and attachment uploads. Run with `npm run dev:blossom`. |
| **Khatru relay** | `relay/main.go` | Nostr WebSocket relay with SQLite persistence, accepts all custom kinds (`30000`–`30006`, `32267`). Run with `npm run dev:relay`. |

All services run in parallel via `npm run dev`.
