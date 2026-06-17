# Reputation System — Implementation Plan

**Kind:** 32267 (addressable, replaces on same `pubkey + kind + d-tag`)

## Relay compatibility

No changes needed. The existing khatru relay with slicestore:
- Accepts all event kinds (no whitelist)
- Supports tag-based queries (`#p`) out of the box
- `ReplaceEvent` is already wired — addressable dedup works
- Only caveat: slicestore is in-memory (lost on restart); swap to
  `sqlitestore` / `pgstore` for production persistence

## Implementation order (bottom-up)

### Layer 1 — Domain
- `domain/review.ts` — `ReviewRating`, `ReviewAuthorRole`, `Review`,
  `ReputationSummary`

### Layer 2 — Nostr infrastructure
- `nostr/kinds.ts` — add `Review = 32267` to `TutorHubKind`
- `adapters/nostr/subscriptionManager.ts` — add to `ALL_KINDS`

### Layer 3 — Port
- `ports/reviewRepository.ts` — three-method interface:
  `subscribeReviewsForSubject`, `getReviewByAuthorAndLesson`,
  `publishReview`

### Layer 4 — Use Cases
- `application/usecases/publishReview.ts` — class `PublishReview`:
  checks invariants (lesson completed, not self-review, no duplicate)
- `application/usecases/computeReputation.ts` — pure function

### Layer 5 — Adapter
- `adapters/nostr/reviewRepository.ts` — `createNostrReviewRepository()`
  using `addKindListener` and `nostrClient.publishReplaceableEvent`

### Layer 6 — DI
- `hooks/RepoContext.tsx` — add `reviewRepository` to context

### Layer 7 — Hooks
- `hooks/useReviewsForSubject.ts` — subscribe + compute reputation
- `hooks/usePublishReview.ts` — wrapper over `PublishReview` use case

### Layer 8 — i18n
- `locales/{en,uk,ru}/review.json` — new namespace `review`

### Layer 9 — UI
- Review form in lesson card/detail (only when `status === "completed"`)
- Reputation in tutor profile (`TutorProfile`)
- Reputation in tutor card (`TutorCard` / `TutorDirectory`)

### Layer 10 — Tests
- Unit: `computeReputation` (empty, single, fractional)
- Unit: `PublishReview` invariants (ok, not_completed, self_review,
  already_exists)
- Adapter: parse event from kind 32267
