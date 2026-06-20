# NIP-65 Cross-Relay Lesson Synchronization

**Status:** Plan (approved)

**Problem:** Tutor publishes `kind 30006` (LessonAgreement) on relay A. Student is connected
to relay B and never sees the lesson because the app has no mechanism to discover and query
the tutor's relays.

**Solution:** NIP-65 (Relay List Metadata, `kind 10002`) + lazy cross-relay query.

---

## 1. Domain types

**`frontend/src/domain/relayList.ts`** (new)

```typescript
export type RelayPurpose = "read" | "write"

export interface RelayListItem {
  url: string
  purpose: RelayPurpose
}

export interface RelayList {
  pubkey: string
  relays: RelayListItem[]
}
```

---

## 2. Constants & client

**`frontend/src/nostr/kinds.ts`**
- Add `RelayListMetadata = 10002`

**`frontend/src/nostr/client.ts`** — add two methods:

- `subscribeToRelays(relays: string[], filter, onEvent)` — creates a temporary `SimplePool`
  scoped to the given relay URLs; returns an unsubscribe function.
- `queryRelays(relays: string[], filter): Promise<NostrEvent[]>` — calls
  `pool.list(relays, filter)` on a transient pool.

---

## 3. Relay list repository

**`frontend/src/adapters/nostr/relayListRepository.ts`** (new)

- `publishRelayList(relays: RelayListItem[])`:
  - kind: `10002`
  - tags: `["r", url, "read"|"write"]` (repeat per relay)
  - content: `""`
  - published to the global/default relay set (so counterparties can discover it)
- `fetchRelayList(pubkey): Promise<RelayList | null>`:
  - `query({ kinds: [10002], authors: [pubkey] })` on global relays
  - parse `r` tags into `RelayListItem[]`
  - cache result in `localStorage` under `tutorhub:relaylist:<pubkey>` with a 1-hour TTL

---

## 4. Cross-relay resolver

**`frontend/src/adapters/nostr/crossRelayResolver.ts`** (new)

```typescript
async function resolveRelaysForUser(pubkey: string): Promise<string[]> {
  1. Check localStorage cache (TTL 1 hour)
  2. If miss → fetchRelayList(pubkey)
  3. Collect write + read relay URLs
  4. If empty → fallback to DEFAULT_RELAYS
  5. Write to cache
  6. Return deduplicated URLs
}
```

---

## 5. Lazy lesson fetch

**`frontend/src/hooks/useLessons.ts`** — extend:

When the hook mounts (student opens Lessons tab):

1. Identify all counterparties whose `tutorPubkey` or `studentPubkey` appears in
   already-known lesson agreements + the current user's pubkey.
2. For each counterparty:
   a. `resolveRelaysForUser(counterpartyPubkey)`
   b. `queryRelays(relays, { kinds: [30006], authors: [counterpartyPubkey], "#p": [myPubkey] })`
   c. Feed returned events into `eventBus.emitEvent()` → `lessonStore.ingest()`
   d. Open a persistent live subscription on the same relays for future changes.

**`frontend/src/adapters/nostr/subscriptionManager.ts`** — extend:

After the lazy query in step 2d, keep the subscription open so that subsequent
`kind 30006` events from that counterparty arrive in real time.

---

## 6. Publish relay list (tutor)

**`frontend/src/application/usecases/publishRelayList.ts`** (new)

- `assertRole(viewerRole, "tutor")` (students may also publish in the future)
- Reads `nostrClient.getRelays()` (the current global relay list)
- Publishes `kind 10002` with all relays tagged as `write`
- Triggered:
  - On first login if no `kind 10002` exists for the user
  - When relay settings change (`useRelays.ts`)

**`frontend/src/hooks/usePublishRelayList.ts`** (new)

- Calls the `PublishRelayList` use case on mount (checks existence first).

---

## 7. Data flow (end-to-end)

```
Tutor:
  1. Publishes kind 30006 (LessonAgreement) on own write relays   [already works]
  2. Publishes kind 10002 (RelayListMetadata) on global relays    → NEW

Student (opens Lessons tab):
  1. Reads tutor's kind 10002 from global relays                  → NEW
  2. Caches in localStorage (TTL 1 hour)                          → NEW
  3. queryRelays(relays, { kinds: [30006],
       authors: [tutorPubkey], "#p": [myPubkey] })                → NEW
  4. Events flow into eventBus → lessonStore                      → NEW
  5. UI renders lessons                                           [already works]
```

---

## 8. File change summary

| File | Action |
|------|--------|
| `src/domain/relayList.ts` | **Create** |
| `src/nostr/kinds.ts` | Add `RelayListMetadata = 10002` |
| `src/nostr/client.ts` | Add `subscribeToRelays()`, `queryRelays()` |
| `src/adapters/nostr/relayListRepository.ts` | **Create** |
| `src/adapters/nostr/crossRelayResolver.ts` | **Create** |
| `src/adapters/nostr/lessonRepository.ts` | Extend `getForUser()` |
| `src/adapters/nostr/subscriptionManager.ts` | Extend with per-user relay subscriptions |
| `src/hooks/useLessons.ts` | Add lazy cross-relay fetch on mount |
| `src/hooks/useRelayList.ts` | **Create** |
| `src/hooks/usePublishRelayList.ts` | **Create** |
| `src/application/usecases/publishRelayList.ts` | **Create** |
| `src/application/usecases/fetchLessonAgreements.ts` | **Create** (or extend existing) |
| `src/adapters/nostr/eventBus.ts` | No change needed (already deduplicates by `event.id`) |
| `src/stores/lessonStore.ts` | No change needed (already handles `kind 30006`) |
