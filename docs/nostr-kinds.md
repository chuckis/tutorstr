# Tutor Hub Nostr Kinds

Custom Nostr kinds used by Tutor Hub, aligned with `frontend/src/nostr/kinds.ts`.

## Conventions

- `content` is JSON unless otherwise noted.
- Tags use NIP-01 `["t", "..."]` for topics and `["p", "<npub>"]` for people.
- Public vs encrypted:
  - Public events: plain JSON in `content`.
  - Encrypted events: `content` is NIP-04 or NIP-44 ciphertext, and the cleartext schema below applies.

## Kind 30000 — TutorProfile (public, replaceable)

Purpose: Publish a tutor's public profile for discovery.

Content schema (JSON):
- `name`: string
- `bio`: string
- `subjects`: string[]
- `languages`: string[]
- `hourlyRate`: number
- `avatarUrl`: string (URL)

Tags:
- `["t", "role:tutor"]`
- `["t", "subject:<subject>"]` (repeat per subject)
- Optional: `["t", "language:<language>"]` (repeat per language)

## Kind 30001 — TutorSchedule (public, replaceable)

Purpose: Publish availability windows for booking.

Content schema (JSON):
- `timezone`: string (IANA, e.g. "Europe/Berlin")
- `slots`: array of `{ start: string; end: string }` in ISO-8601

Tags:
- `["t", "role:tutor"]`

## Kind 30002 — BookingRequest (encrypted, addressed)

Purpose: Student requests a lesson slot with a tutor.

Content schema (JSON):
- `requestedSlot`: `{ start: string; end: string }` (ISO-8601)
- `message`: string
- `studentNpub`: string (npub)

Tags:
- `["p", "<tutor_npub>"]` (required)
- Optional: `["t", "booking:request"]`

## Kind 30003 — BookingStatus (encrypted, replaceable per booking)

Purpose: Tutor updates status of a booking request.

Content schema (JSON):
- `bookingId`: string (client-generated id for replaceable thread)
- `status`: "accepted" | "rejected" | "completed" | "cancelled"
- `note`: string (optional)

Tags:
- `["p", "<student_npub>"]` (required)
- Optional: `["t", "booking:status"]`

## Kind 30004 — StudentProgress (encrypted)

Purpose: Student or tutor logs progress for a booking.

Content schema (JSON):
- `bookingId`: string
- `topic`: string
- `notes`: string
- `score`: number (optional)

Tags:
- `["p", "<counterparty_npub>"]` (required)
- Optional: `["t", "progress:log"]`

## Kind 30005 — TutorBlogPost (public)

Purpose: Public blog post authored by a tutor.

Content schema (JSON):
- `title`: string
- `body`: string (markdown)
- `publishedAt`: string (ISO-8601)

Tags:
- `["t", "role:tutor"]`
- Optional: `["t", "blog"]`

## Kind 30006 — LessonAgreement (public, replaceable per lesson)

Purpose: Persist a confirmed lesson contract between tutor and student and drive dashboard cards.

Content schema (JSON):
- `lessonId`: string (must match `d` tag)
- `bookingId`: string
- `subject`: string
- `scheduledAt`: string (ISO-8601)
- `durationMin`: number
- `price`: number
- `currency`: string
- `status`: `"scheduled" | "completed" | "cancelled"`

Tags:
- `["d", "<lesson_id>"]` (required)
- `["p", "<tutor_pubkey>"]` (required)
- `["p", "<student_pubkey>"]` (required)
- `["e", "<booking_request_event_id>"]` (required)
- Optional: `["t", "lesson:agreement"]`
