# Architecture Audit

Date: 2026-05-09
Scope: `frontend/src/domain`, `frontend/src/ports`, `frontend/src/application/usecases`, `frontend/src/adapters/nostr`, `frontend/src/hooks`

## 1. Executive Summary
The frontend is in a genuine hybrid migration state rather than a cleanly separated Clean Architecture implementation. The good news is that the project already has the right nouns in place: `domain/` models are small and readable, `ports/` exist for bookings and lessons, and the `AcceptBooking` use case already depends on ports instead of React or Nostr. That gives the team a workable seam for continuing the migration.

The main risk is that the current runtime flow still passes through hooks that directly own Nostr subscriptions, event parsing, transport-specific tag handling, encryption calls, and several pieces of booking/lesson decision logic. In practice, `hooks/` currently behave as a mixed application-plus-adapter layer. The top 3 risks are: `1)` dependency direction is still inverted in multiple hooks through direct imports from `adapters/nostr/`, `2)` booking/lesson business rules live in React hooks instead of `application/` or `domain/`, and `3)` Nostr event parsing and crypto remain spread across hooks, which will make testing and further relay abstraction slower and riskier.

## 2. Dependency Map
Observed target shape:
- `domain/` is mostly independent, but not fully isolated yet.
- `application/usecases/` currently depends only on `domain/` and `ports/`, which is the cleanest part of the booking flow.
- `adapters/nostr/` performs domain mapping, but hooks still bypass ports and call those adapters directly.
- `hooks/` still own most inbound and outbound Nostr traffic through `nostrClient`, `JSON.parse`, tag extraction, and encrypted event publishing.

Generated diagram:
- [architecture-audit-dependency-map.mmd](docs/diagrams/architecture-audit-dependency-map.mmd)

Current dependency shape in plain English:
- `useBookings` builds a `BookingRepository` inside a hook, maps raw Nostr events with `bookingFromNostr`, computes slot winners and active bids, and then constructs `AcceptBooking`.
- `useLessonRepository` builds a `LessonRepository` inside a hook, maps agreement events with `lessonFromNostr`, and publishes lesson events through `useBookingActions`.
- Several read hooks such as `useBookingRequestsForTutor`, `useBookingStatusesForUser`, `useLessonAgreementsForUser`, and `useEncryptedMessages` subscribe directly to relays and parse Nostr payloads in-place.
- `usePrivateMessagingActions` and `useBookingActions` publish encrypted/public Nostr events directly from hooks.

## 3. Violations Log
| File:lines | Problem | Violated principle | Recommendation | Effort |
| --- | --- | --- | --- | --- |
| `frontend/src/hooks/useBookings.ts:2` | Hook imports `bookingFromNostr` and `bookingStatusToNostr` directly from `adapters/nostr/bookingAdapter`. | Dependency Rule; Hook Boundaries | Move Nostr-to-domain mapping and domain-to-event status mapping behind a concrete booking repository adapter. `useBookings` should consume a port or an already-adapted query hook, not import adapter functions. | S |
| `frontend/src/hooks/useBookings.ts:64-142` | `requestsByAllocationKey`, `winnerByAllocationKey`, and `activeBidBySlotAndStudent` contain booking conflict resolution and winner selection logic inside a React hook. | Hook Boundaries | Extract these reducers into `domain/` or `application/queries/` pure functions. Keep the hook responsible only for memoization and wiring. | M |
| `frontend/src/hooks/useBookings.ts:144-183` | The `BookingRepository` implementation is created inside the hook and publishes Nostr status events via `useBookingActions`. This mixes port implementation, transport serialization, and hook state. | Dependency Rule; Nostr Isolation | Create a concrete booking repository adapter in `adapters/nostr/` that owns event publishing and raw event mapping. The hook should instantiate it or receive it, not implement it inline. | M |
| `frontend/src/hooks/useBookings.ts:196-218` | Lesson construction policy is embedded in the hook: duration fallback, slot end parsing, and default subject assignment happen next to React memoization. | Hook Boundaries; Testability | Move lesson creation policy into `AcceptBooking` collaborators such as a `LessonFactory` in `application/` or a pure domain helper. Pass only configuration from the hook. | M |
| `frontend/src/hooks/useLessonRepository.ts:2` | Hook imports `lessonFromNostr` and `lessonToNostrStatus` directly from `adapters/nostr/lessonAdapter`. | Dependency Rule; Hook Boundaries | Replace direct adapter imports with a concrete `LessonRepository` adapter or an application service that hides the Nostr mapping. | S |
| `frontend/src/hooks/useLessonRepository.ts:18-54` | The hook is simultaneously a port implementation, Nostr mapper, and event publisher. | Dependency Rule; Nostr Isolation | Split into `adapters/nostr/LessonRepositoryNostrAdapter` plus a thinner hook that exposes the port to UI/application code. | M |
| `frontend/src/hooks/useLessons.ts:2,12-18,21-38` | Hook directly maps Nostr agreements into domain lessons and performs lesson bucketing policy. | Dependency Rule; Hook Boundaries | Consume `LessonRepository` output only. Move bucketing to a pure selector such as `groupLessonsByTimeline`. | S |
| `frontend/src/hooks/useAuthController.ts:9-12,49-60,85-106,125-153` | Auth hook composes concrete storage, key, crypto, and signer adapters, and also mutates the singleton `nostrClient`. It acts as a composition root and runtime workflow layer at the same time. | Hook Boundaries; Nostr Isolation | Keep hook-level state management, but move signer/client session orchestration into an application-facing auth service. Leave the hook responsible for UI state transitions only. Mark as hybrid until broader auth refactor is scheduled. | M |
| `frontend/src/hooks/useBookingActions.ts:17-119` | Hook directly creates booking IDs, assembles Nostr tags, serializes payloads, and publishes request/status/agreement events. | Hook Boundaries; Nostr Isolation | Move publishing code into outbound adapters or command services. The hook should call an injected port such as `BookingCommands` / `LessonCommands`. | M |
| `frontend/src/hooks/useLessonAgreementsForUser.ts:12-88` | Hook subscribes to relays, parses JSON, resolves participant tags, and applies fallback relay-query behavior. This is adapter logic living in the UI layer. | Hook Boundaries; Nostr Isolation | Convert to a Nostr adapter that exposes a domain-facing stream/query API. Keep the hook as a thin subscription wrapper if React lifecycle ownership is still desired. | M |
| `frontend/src/hooks/useBookingRequestsForTutor.ts:11-46` | Hook directly subscribes to kind `30002`, parses event JSON, extracts `d` and `p` tags, and resolves recency. | Hook Boundaries; Nostr Isolation | Move request-event parsing and merge rules into `adapters/nostr/bookingAdapter` or a repository adapter. | S |
| `frontend/src/hooks/useBookingStatusesForUser.ts:11-60` | Hook directly subscribes to kind `30003`, parses JSON, extracts tags, and maintains last-write-wins status state. | Hook Boundaries; Nostr Isolation | Same fix path as booking requests: isolate event parsing and merge semantics in a repository adapter. | S |
| `frontend/src/hooks/useEncryptedMessages.ts:22-64` | Hook performs direct encrypted relay subscriptions and decryption via `nostrClient.decryptContent`. | Hook Boundaries; Nostr Isolation | Introduce a messaging adapter/repository that owns encrypted event IO and returns plaintext message DTOs or domain objects. | M |
| `frontend/src/hooks/usePrivateMessagingActions.ts:6-19` | Hook directly publishes encrypted kind `4` and `30004` events. | Hook Boundaries; Nostr Isolation | Route message sending through a messaging port implemented in `adapters/nostr/`. | S |
| `frontend/src/domain/slotAllocation.ts:1,3-15` | Closed on 2026-05-09: `slotAllocation.ts` now depends on domain `TimeSlot` instead of `types/nostr`. | Dependency Rule | Completed via `frontend/src/domain/TimeSlot.ts` and inward reuse from `types/nostr.ts`. | S |
| `frontend/src/application/usecases/acceptBooking.ts:17-31` | The default `LessonFactory` uses `crypto.randomUUID()`, which makes the use case less deterministic and slightly less pure-by-default. | Testability | Inject ID creation from the composition layer or require a factory dependency explicitly. Current state is workable but should be tightened before more use cases follow the same pattern. | S |

### Notes Requiring Team Discussion
- `frontend/src/hooks/useAuthController.ts` may intentionally act as a local composition root during migration. If so, document that exception explicitly instead of letting it look accidental.
- `frontend/src/hooks/useLessonAgreementsForUser.ts:69-81` contains a broad relay fallback query. The fallback may be product-critical for relay compatibility, but it belongs in an adapter where performance and dedupe policy can be tested outside React.

## 4. Prioritized Recommendations Table
| Priority | Recommendation | Why now | Expected outcome |
| --- | --- | --- | --- |
| Quick Win | Move slot types out of `types/nostr` and into `domain/` | Removes an inner-layer dependency leak with low blast radius | `domain/` no longer depends on transport schema files |
| Quick Win | Extract booking selectors from `useBookings` into pure functions | High-value test seam with minimal UI churn | Winner selection and active bid rules become unit-testable |
| Quick Win | Extract lesson bucketing from `useLessons` into a pure selector | Easy cleanup, improves hook readability | Hook becomes mostly orchestration |
| Quick Win | Inject ID generation into `AcceptBooking` | Makes use case deterministic in tests | Cleaner application contract |
| Mid-term | Create Nostr-backed `BookingRepository` and `LessonRepository` adapters | Removes the biggest hook-to-adapter dependency leaks | Hooks consume ports instead of implementing repositories inline |
| Mid-term | Introduce message command/query ports for encrypted chat and progress entries | Consolidates crypto and Nostr event handling | All encryption and message transport lives under `adapters/nostr/` |
| Mid-term | Move Nostr subscription parsing from read hooks into adapter/query services | Reduces React-layer complexity and improves reuse | Hooks become lifecycle wrappers around already-shaped data |
| Long-term | Add an application query layer for timeline/grouping selectors | Prevents logic from bouncing back into hooks as features grow | Stable place for non-entity business read models |
| Long-term | Define a documented composition root for auth and Nostr client wiring | Clarifies where concrete adapters are allowed | Fewer accidental boundary violations during migration |

## 5. Refactoring Tickets List
1. Create `domain/timeSlot.ts` and replace `ScheduleSlot` imports from `types/nostr` in `domain/slotAllocation.ts`.
2. Extract `buildRequestsByAllocationKey`, `selectWinningOccupancyByAllocationKey`, and `selectActiveBidBySlotAndStudent` from `useBookings.ts` into pure tested modules.
3. Move the inline `BookingRepository` implementation out of `useBookings.ts` into `frontend/src/adapters/nostr/bookingRepository.ts`.
4. Move lesson creation defaults and duration calculation out of `useBookings.ts` into an application-level lesson factory used by `AcceptBooking`.
5. Move the inline `LessonRepository` implementation out of `useLessonRepository.ts` into `frontend/src/adapters/nostr/lessonRepository.ts`.
6. Replace direct `lessonAdapter` imports in `useLessons.ts` and `useLessonRepository.ts` with repository/application abstractions.
7. Introduce a `MessagingRepository` or `MessageService` port for encrypted DM and progress log send/read flows.
8. Migrate `useBookingRequestsForTutor.ts`, `useBookingStatusesForUser.ts`, and `useLessonAgreementsForUser.ts` to adapter-owned parsing/merge logic with hook wrappers only.
9. Add unit tests for `AcceptBooking`, slot winner selection, lesson bucketing, and booking status merge behavior using fake repositories instead of Nostr mocks.
10. Document auth as an approved hybrid composition root or split client/signer wiring into an explicit application service.

## 6. Prevention Measures
- Add ESLint boundaries for `frontend/src/domain`, `frontend/src/application`, `frontend/src/adapters`, and `frontend/src/hooks`.
- Enforce: `domain/**` cannot import from `types`, `nostr`, `hooks`, or `adapters`.
- Enforce: `application/**` cannot import from `react`, `nostr`, `hooks`, or concrete adapters.
- Enforce: `hooks/**` cannot import from `adapters/nostr/**` directly, except for a short-lived allowlist of explicitly documented hybrid files.
- Add CI checks using `dependency-cruiser`, `eslint-plugin-boundaries`, or `import/no-restricted-paths`.
- Add a migration note to `frontend/src/adapters/nostr/README.md` listing approved hybrid files and the intended destination layer for each.
- Add `HYBRID:` comments to temporary boundary exceptions such as `useAuthController.ts`, `useBookings.ts`, and `useLessonRepository.ts` so reviewers can distinguish intentional debt from regressions.
- Add a PR checklist item: "Does this change move Nostr parsing/crypto closer to adapters and keep hooks thinner?"

## Bottom Line
The codebase is not yet compliant with the target Clean Architecture boundaries, but it is close enough structurally that the next refactor cycle can make visible progress without a rewrite. The strongest foundation already exists in `ports/` and `application/usecases/acceptBooking.ts`; the highest leverage work is to stop implementing repositories and Nostr parsing inside hooks.
