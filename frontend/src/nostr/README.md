# Nostr — Transport Layer

Nostr relay client, configuration, and event kind definitions.

## Files

| File | Purpose |
|------|---------|
| `client.ts` | `NostrClient` — wrapper around `nostr-tools` SimplePool (publish/subscribe) |
| `config.ts` | Default relay URLs (from env or hardcoded) |
| `kinds.ts` | `TutorHubKind` enum (30000–30006, 32267 — Review) |

## Rules

- Primary consumers are adapters (repository layer), `App.tsx`, and `RepoContext.tsx`
- **Acknowledged deviation:** Several hooks import from here directly when abstracting Nostr transport behind a port adds no value:
  - `useAuthController` — `nostrClient` (NIP-07/NIP-55/NIP-46 role discovery)
  - `useLessons` — `nostrClient`, `TutorHubKind` (lesson subscription)
  - `useRelays` — `DEFAULT_RELAYS` (relay list config)
  - `usePublishRelayList` — `nostrClient` (relay list publish)
- UI components never import from here directly
