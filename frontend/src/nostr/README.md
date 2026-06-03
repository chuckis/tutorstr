# Nostr — Transport Layer

Nostr relay client, configuration, and event kind definitions.

## Files

| File | Purpose |
|------|---------|
| `client.ts` | `NostrClient` — wrapper around `nostr-tools` SimplePool (publish/subscribe) |
| `config.ts` | Default relay URLs (from env or hardcoded) |
| `kinds.ts` | `TutorHubKind` enum (30000–30006) |

## Rules

- Only imported by adapters (repository layer) — `App.tsx` and `RepoContext.tsx` are the composition root exceptions
- Hooks no longer import from here; they access Nostr through `RepoContext` port adapters
- UI components never import from here directly
