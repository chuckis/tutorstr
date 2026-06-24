# Nostr Adapters

This directory contains Nostr-facing implementations of port interfaces and transport infrastructure. Converts between raw Nostr events and app-facing domain models.

## Why this exists

Nostr events use protocol-oriented field names and status values that do not always match the app's internal model. These adapters normalize that mismatch in one place.

Benefits:
- hooks and repositories can work with stable domain types like `Booking` and `Lesson`
- Nostr-specific naming stays out of most UI and application logic
- status conversions are centralized
- changing event payload structure later is safer because the mapping lives in one layer

## Data mapping adapters

### `bookingAdapter.ts`

Converts booking-related Nostr events into the internal `Booking` model.

Responsibilities:
- build a `Booking` from a `BookingRequestEvent`
- optionally merge the latest `BookingStatusEvent`
- normalize unknown or missing statuses to `pending`
- convert internal booking status values back into Nostr-compatible values when publishing updates

Consumers: [`bookingRepository.ts`](./bookingRepository.ts), [`bookingEventsRepository.ts`](./bookingEventsRepository.ts)

### `lessonAdapter.ts`

Converts lesson agreement events into the internal `Lesson` model.

Responsibilities:
- build a `Lesson` from a `LessonAgreementEvent`
- map Nostr lesson status values to the app's domain status values
- translate the domain value `canceled` back to Nostr's `cancelled` spelling when publishing

Consumers: [`lessonRepository.ts`](./lessonRepository.ts)

### `parseLessonNoteFromEvent.ts`

Parses decrypted kind-30004 JSON payloads into `LessonNote` domain objects.

Responsibilities:
- check the `type` discriminator field (`"lesson_note"`)
- extract `lessonId`, `noteType`, `content`, `attachments`
- return `null` for non-note payloads (e.g. progress entries using the same kind)

Consumers: [`lessonNoteRepository.ts`](./lessonNoteRepository.ts)

## Repository adapters

| File | Port | Kind | Used by |
|------|------|------|---------|
| `profileEventRepository.ts` | `ProfileEventRepository` | 0 | `useTutorProfile`, `useTutorDirectory` |
| `scheduleEventRepository.ts` | `ScheduleEventRepository` | 30001 | `useTutorSchedule`, `useTutorSchedules` |
| `bookingEventsRepository.ts` | `BookingEventsRepository` | 30002, 30003 | `useBookings`, `useBookingEventsRepository` |
| `bookingRepository.ts` | `BookingRepository` | 30002, 30003 | `useBookings` |
| `lessonNoteRepository.ts` | `LessonNoteRepository` | 30004 | `useLessonNote` |
| `privateMessagingRepository.ts` | `PrivateMessagingRepository` | 30004, 4 | `useEncryptedMessages`, `usePrivateMessagingActions` |
| `lessonAgreementEventsRepository.ts` | `LessonAgreementEventsRepository` | 30006 | `useLessonAgreementsForUser` |
| `lessonRepository.ts` | `LessonRepository` | 30006 | `useLessons` |
| `publicLessonRepository.ts` | `PublicLessonRepository` | 30006 | `usePublicAllocatedSlots` |
| `blogRepository.ts` | `BlogRepository` | 30005 | `useTutorBlog`, `useMyBlog` |
| `muteListEventRepository.ts` | `MuteListRepository` | 10000 | `useModeration` |
| `reportEventRepository.ts` | `ReportRepository` | 1984 | `useModeration` |
| `reviewRepository.ts` | `ReviewRepository` | 32267 | `useReviewsForSubject`, `usePublishReview` |
| `relayListRepository.ts` | — | 10002 | `useRelayList`, `usePublishRelayList` |
| `relayManager.ts` | `RelayManager` | — | `useRelays` |
| `blossomMediaRepository.ts` | `MediaUploadRepository` | — | `useBlossomConfig` |

## Signer implementations

| File | Port | Description |
|------|------|-------------|
| `vaultNostrSigner.ts` | `NostrSigner` | Signs events using passphrase-decrypted nsec from local vault |
| `nip07Signer.ts` | `NostrSigner` | Delegates to NIP-07 browser extension (e.g. Alby) |
| `nip46Signer.ts` | `NostrSigner` | NIP-46 remote signer protocol (bunker) with JSON-RPC handshake |
| `nip55Signer.ts` | `NostrSigner` | NIP-55 Android native signer (Amber/Nowser) via sessionStorage |
| `nostrSignerManager.ts` | `SignerManager` | Set/get active NostrSigner on the client |

## Infrastructure

| File | Description |
|------|-------------|
| `subscriptionManager.ts` | Manages global and per-user subscriptions to all TutorHub kinds, routes events into event bus |
| `eventBus.ts` | Zustand-backed in-memory event bus routing Nostr events to kind-specific listeners |
| `crossRelayResolver.ts` | Fetches user's NIP-65 relay list with localStorage cache and TTL-based freshness |
| `hydrationService.ts` | Subscribes to all TutorHub kinds on startup, marks stores hydrated after initial batch |
| `pollingService.ts` | Polls relays every 60s for new events on key kinds, catches subscription gaps |

## Design rule

Keep these files focused on data mapping and Nostr transport only.

Good fit for this directory:
- renaming fields
- merging multiple raw events into one domain object
- enum/status normalization
- transport-to-domain and domain-to-transport conversion
- relay subscription and event routing logic
- signer protocol implementations

Not a good fit for this directory:
- React state management
- UI formatting
- business workflows

That logic belongs in hooks, application use cases, or UI components.

## When to add a new adapter

Add a new file here when a new Nostr event kind needs to be translated into a domain model or when a new signer protocol needs to be supported. If a hook starts doing repeated inline mapping from Nostr events into app models, that mapping probably belongs here.
