# Centralized Subscription Bus (Zustand + EventBus)

## Problem

Currently each React hook independently creates Nostr subscriptions via adapter
→ `nostrClient.subscribe()` → `SimplePool.subscribe()`. This results in **12–15
concurrent WebSocket subscriptions** that are always active, each feeding a
separate `useState` accumulator in its own hook. There is no event deduplication
across hooks, no sharing of events, and no central store.

## Solution

Introduce a **Zustand-based EventBus** in the adapter layer that:

1. Collects **all** raw Nostr events from a **single global subscription**
2. Deduplicates globally by `event.id`
3. Distributes new events to adapter subscribers via `addKindListener(kind, cb)`
4. Maintains a queryable cache (`eventsByKind`) for instant replay on subscribe

### Clean Architecture Placement

```
frontend/src/
├── domain/           ← unchanged (pure types)
├── application/      ← unchanged (use cases, assertRole)
├── ports/            ← unchanged (interfaces stay the same)
├── nostr/            ← unchanged (NostrClient, SimplePool)
├── adapters/nostr/
│   ├── eventBus.ts              ← NEW: Zustand store (сырые события)
│   ├── subscriptionManager.ts   ← NEW: одна глобальная подписка
│   ├── bookingEventsRepository.ts ← MODIFIED: читает из eventBus
│   ├── profileEventRepository.ts  ← MODIFIED: читает из eventBus
│   ├── scheduleEventRepository.ts ← MODIFIED: читает из eventBus
│   ├── lessonAgreementEventsRepository.ts ← MODIFIED: читает из eventBus
│   ├── privateMessagingRepository.ts    ← MODIFIED: читает из eventBus
│   ├── publicLessonRepository.ts        ← MODIFIED: читает из eventBus
│   └── lessonNoteRepository.ts          ← MODIFIED: читает из eventBus
└── hooks/            ← minimally changed
```

**Zustand is an adapter implementation detail.** Domain, ports, and application
never import it. Port interfaces remain callback-based (`subscribe*(..., onData)`).

## Plan

### Step 1: Install zustand

```bash
npm install zustand
```

### Step 2: Create `eventBus.ts` (Zustand store)

New file `frontend/src/adapters/nostr/eventBus.ts`.

- Zustand store with `eventsByKind: Record<number, Record<string, NostrEvent>>`
- Global dedup by `event.id`
- `addKindListener(kind, onNewEvent): () => void` — per-kind listener registry
  outside Zustand (avoids serialization cost). Replays existing events on
  subscribe, then delivers only new events (delta).
- `emitEvent(event)` — adds to store + notifies kind listeners
- `addEvent(event)` — Zustand setter (for store subscription)

### Step 3: Create `subscriptionManager.ts`

New file `frontend/src/adapters/nostr/subscriptionManager.ts`.

- Single `nostrClient.subscribe()` with filter
  `{ kinds: [4, 30000, 30001, 30002, 30003, 30004, 30006], limit: 200 }`
- Each incoming event → `emitEvent(event)`
- EOSE tracker sets `loading = false` after all kinds report EOSE
- `startGlobalSubscription()` / `stopGlobalSubscription()`

### Step 4: Integrate in RepoContext

Call `startGlobalSubscription()` in a `useEffect` in `RepoContext.tsx` (or in a
new wrapper). This starts the single Nostr subscription once when the
authenticated app mounts.

### Step 5: Refactor adapters

Each adapter's `subscribe*` method changes from:

```typescript
subscribe*(args, onData) {
  return nostrClient.subscribe({ kinds: [N], ...filter }, onData);
}
```

To:

```typescript
subscribe*(args, onData) {
  return addKindListener(KIND, (rawEvent) => {
    if (!matchesFilter(rawEvent, args)) return;
    const parsed = parse(rawEvent);
    onData(parsed);
  });
}
```

- Filtering (`#p`, `authors`, etc.) stays in the adapter
- `publish*` methods stay unchanged
- `privateMessagingRepository` (kind 4): raw encrypted event → decrypt async →
  `onMessage` (same as now, but triggered from store instead of Nostr callback)

### Step 6: Simplify hooks

- Remove `useState<Record<string, T>>` accumulators (store handles it)
- Remove `LOAD_TIMEOUT` pattern (global loading from store)
- Keep `useEffect` + unsubscribe pattern (adapter subscribe still returns
  cleanup, now removes listener from eventBus instead of closing WebSocket)

### Step 7 (optional, future): Port interfaces to read-only

When all subscribe methods are thin store-readers, ports can evolve from
callback-based to read-only query interfaces:

```typescript
interface ProfileEventRepository {
  getAllProfiles(): UserProfileEvent[];
  getProfile(pubkey: string): UserProfileEvent | undefined;
}
```

Not required for MVP.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Event loss if listener-proxy desyncs | `addKindListener` replays existing events on subscribe |
| Kind 4 decryption is async | Decryption stays in adapter; eventBus stores raw, adapter decrypts on delivery |
| Memory growth from all events | Add TTL / max-events-per-kind / LRU trim in eventBus |
| limit 200 insufficient for some kinds | Per-kind limit config in subscriptionManager |
| Test breaks | Only adapters change; application-layer tests unaffected |

## Verification

1. `npm run build` — TypeScript compiles
2. `npm test` — existing tests pass
3. Manual: app loads, events appear in all 4 tabs, chat works, booking flow works
