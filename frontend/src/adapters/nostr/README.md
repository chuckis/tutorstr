# Nostr Adapters

This directory contains small translation helpers between:

- raw Nostr-facing event shapes from [`src/types/nostr.ts`](../../types/nostr.ts)
- app-facing domain models from [`src/domain`](../../domain)

The purpose of this layer is to keep the rest of the frontend from depending on Nostr payload details directly.

## Why this exists

Nostr events use protocol-oriented field names and status values that do not always match the app's internal model.
These adapters normalize that mismatch in one place.

That gives us a few benefits:

- hooks and repositories can work with stable domain types like `Booking` and `Lesson`
- Nostr-specific naming stays out of most UI and application logic
- status conversions are centralized
- changing event payload structure later is safer because the mapping lives in one layer

In short: this directory is the boundary between transport data and domain data.

## Files

### `bookingAdapter.ts`

Converts booking-related Nostr events into the internal `Booking` model.

Responsibilities:

- build a `Booking` from a `BookingRequestEvent`
- optionally merge the latest `BookingStatusEvent`
- normalize unknown or missing statuses to `pending`
- convert internal booking status values back into Nostr-compatible values when publishing updates

Current consumers:

- [`useBookings.ts`](../../hooks/useBookings.ts)

### `lessonAdapter.ts`

Converts lesson agreement events into the internal `Lesson` model.

Responsibilities:

- build a `Lesson` from a `LessonAgreementEvent`
- map Nostr lesson status values to the app's domain status values
- translate the domain value `canceled` back to Nostr's `cancelled` spelling when publishing

Current consumers:

- [`useLessons.ts`](../../hooks/useLessons.ts)
- [`useLessonRepository.ts`](../../hooks/useLessonRepository.ts)

## Design rule

Keep these files focused on data mapping only.

Good fit for this directory:

- renaming fields
- merging multiple raw events into one domain object
- enum/status normalization
- transport-to-domain and domain-to-transport conversion

Not a good fit for this directory:

- relay access
- event publishing/subscription logic
- React state management
- UI formatting
- business workflows

That logic belongs in hooks, services, repositories, or application use cases.

## When to add a new adapter

Add a new file here when a new Nostr event kind needs to be translated into a domain model or when a domain model needs a dedicated conversion back into a Nostr payload.

Examples:

- tutor profile adapter
- tutor schedule adapter
- encrypted progress log adapter

If a hook starts doing repeated inline mapping from Nostr events into app models, that mapping probably belongs here.
