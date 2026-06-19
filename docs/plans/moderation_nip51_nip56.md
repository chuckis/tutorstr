# Moderation — NIP-51 / NIP-56 Implementation Plan

**NIP-51:** Kind `10000` — Mutelist (replaceable, per-user block list)
**NIP-56:** Kind `1984` — Report (user- or event- targeted complaint)

## Design principle

- **Self-applied:** each user's mute list filters content **for that user only**
- **No cascade:** a tutor's mute list is never automatically applied to other users
- **Reports are signals, not verdicts:** kind 1984 events inform but never auto-ban
- **Clean Architecture:** domain layer knows nothing about Nostr; ports are interface-only

## Anti-abuse measures

| Layer | Protection | Mechanism |
|-------|-----------|-----------|
| Domain | `filterMuted` uses **only own mute list** | No way to ban a competitor on behalf of others |
| Application | Rate-limit on `publishReport` | ≤ 5 reports / hour per pubkey |
| Application | Rate-limit on `publishMuteList` | ≤ 10 blocks / hour per pubkey |
| Adapter | `addKindListener` only — no auto-propagation | Each user reads only their own mute list |
| UI | "Reported by N" badge instead of auto-ban | Information, not enforcement |
| Future | Reputation-weighted report scoring | Low-rep reporters carry less weight |

## Implementation order (bottom-up)

### Layer 1 — Nostr constants
- `nostr/kinds.ts` — add `MuteList = 10000`, `Report = 1984` to `TutorHubKind`

### Layer 2 — Domain
- `domain/moderation.ts` — pure types and selectors:
  - `BlockEntry { pubkey, mutedAt, reason? }`
  - `MuteList { entries, updatedAt }`
  - `Report { targetPubkey, targetEventId?, reason, label? }`
  - `ReportLabel = "spam" | "nudity" | "profanity" | "illegal" | "impersonation"`
  - `isPubkeyMuted(muteList, pubkey): boolean`
  - `filterMuted<T extends { pubkey: string }>(items, mutedPubkeys): T[]`

### Layer 3 — Ports (interfaces)
- `ports/muteListRepository.ts`:
  ```ts
  interface MuteListRepository {
    subscribe(pubkey: string, onEvent: (event: MuteListEvent) => void): () => void
    subscribeAll(onEvent: (event: MuteListEvent) => void): () => void
    publish(pubkey: string, mutedPubkeys: string[]): Promise<string>
  }
  ```
- `ports/reportRepository.ts`:
  ```ts
  interface ReportRepository {
    publish(targetPubkey: string, reason: string, options?: { eventId?: string; label?: string }): Promise<string>
  }
  ```

### Layer 4 — Application use cases
- `application/usecases/publishMuteList.ts`:
  - `assertRole(viewerRole, "tutor")` — only tutors publish authoritative mute lists
  - Reads current list + diff → publishes kind 10000
- `application/usecases/publishReport.ts`:
  - No role guard (anyone can report)
  - Rate-limit check → publishes kind 1984

### Layer 5 — Adapters (Nostr implementations)
- `adapters/nostr/muteListEventRepository.ts`:
  - `subscribe` / `subscribeAll` via `addKindListener(10000, ...)`
  - `publish` via `nostrClient.publishReplaceableEvent(10000, "", tags)`
- `adapters/nostr/reportEventRepository.ts`:
  - `publish` via `nostrClient.publishEvent(1984, reason, tags)`
- `adapters/nostr/subscriptionManager.ts` — add `10000` and `1984` to `ALL_KINDS`

### Layer 6 — DI (RepoContext)
- `hooks/RepoContext.tsx` — add `muteListRepository`, `reportRepository` to context value + provider

### Layer 7 — Hooks
- `hooks/useModeration.ts`:
  - Subscribes to own mute list via `muteListRepository.subscribe(pubkey)`
  - `addMute(pubkey)`, `removeMute(pubkey)`, `isMuted(pubkey)`
  - Returns `{ mutedPubkeys, addMute, removeMute, isMuted }`
- `hooks/useContentFilter.ts`:
  - Pure React wrapper over `filterMuted`
  - `useContentFilter(items, mutedPubkeys)` → filtered items

### Layer 8 — Components
- `components/BlockedUsersList.tsx` — list of blocked pubkeys with unblock button
  - Integrated into `DashboardSettingsDrawer` as a new section
- Block / Report buttons on:
  - `TutorCard` (discover)
  - `RequestCard` / `RequestDetailsView`
  - `MessageComposer` header area
- Content filtering in:
  - `useTutorDirectory` → exclude muted tutors from discover
  - `useBookings` → filter muted users' requests
  - `MessageThread` → hide messages from muted users (option to reveal)

### Layer 9 — i18n
- New file `locales/en/moderation.json`:
  ```json
  { "block": "Block", "unblock": "Unblock",
    "blockedUsers": "Blocked Users",
    "blockedUsersEmpty": "No blocked users",
    "reportUser": "Report User",
    "reportReason": "Reason", "reportSent": "Report submitted",
    "blockConfirm": "Block {name}? They will not be able to contact you.",
    "reportedBy": "Reported by {count} user(s)",
    "rateLimitError": "Too many actions. Please try later." }
  ```

### Layer 10 — Tests
- `domain/moderation.test.ts` — `isPubkeyMuted`, `filterMuted`
- `application/usecases/publishMuteList.test.ts` — happy + `RoleMismatchError`
- `application/usecases/publishReport.test.ts` — happy + rate-limit
- `adapters/nostr/muteListEventRepository.test.ts` — subscribe, publish

### Layer 11 — Integration
- Wire filtering into existing views:
  - `DiscoverTab` passes muted list → `useTutorDirectory` filters tutors
  - `RequestsTab` filters incoming/outgoing requests against muted list
  - `MessageThread` filters messages from blocked users
  - `ProfileTab` shows block/unblock for other users

## Future: REST API possibility

Port interfaces (`MuteListRepository`, `ReportRepository`) allow a REST adapter
without changing domain or application layers:

```ts
class RestMuteListRepository implements MuteListRepository {
  async publish(pubkey, mutedPubkeys) {
    await fetch("POST /api/v1/moderation/ban", { body: { pubkey, banned: mutedPubkeys } })
  }
}
```

Server-side `POST /api/v1/moderation/ban` would set `is_banned = true` in a
central DB and block requests at the backend level — same interface, different
adapter.

## Future: Relay-level blocking

In `relay/main.go`, add:
- Subscribe to kind 1984 for logging
- Optional: check `npub deny list` in `relay.StoreEvent` callback to reject
  events from banned pubkeys at the relay level
