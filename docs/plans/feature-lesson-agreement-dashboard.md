Technical Specification (for Codex)
Feature: Lesson Agreement & Dashboard Card

Objective

Persist accepted bookings as structured lesson agreements and show them as dashboard cards for both tutor and student.

1. Lesson Agreement Event
Trigger

Tutor accepts a booking request (kind 30002) by publishing booking status `accepted` (kind 30003).

Action

Create a new Nostr event of kind 30006 (`LessonAgreement`).

Rationale

Kind 30005 is already used by Tutor Blog Post. Lesson agreements must use a dedicated kind.

Event Structure

```json
{
  "kind": 30006,
  "pubkey": "<tutor_pubkey>",
  "tags": [
    ["d", "<lesson_id>"],
    ["p", "<tutor_pubkey>"],
    ["p", "<student_pubkey>"],
    ["e", "<booking_request_event_id>"],
    ["t", "lesson:agreement"]
  ],
  "content": "{\"lessonId\":\"<lesson_id>\",\"bookingId\":\"<booking_id>\",\"subject\":\"Math lesson\",\"scheduledAt\":\"2026-02-20T15:00:00Z\",\"durationMin\":60,\"price\":50,\"currency\":\"USD\",\"status\":\"scheduled\"}"
}
```

Content schema (JSON):

- `lessonId`: string (must match `d` tag)
- `bookingId`: string
- `subject`: string
- `scheduledAt`: ISO-8601 UTC datetime
- `durationMin`: number
- `price`: number
- `currency`: string
- `status`: `scheduled | completed | cancelled`

Rules:

- Addressable: must include `["d", "<lesson_id>"]`
- Replaceable per lesson: status updates keep same `d` value and same author pubkey
- Author: tutor pubkey

2. Dashboard View
Requirements

Frontend must:

- Subscribe to kind 30006
- Filter events where current user pubkey is participant (`#p`) or author (`authors`)
- Sort by `scheduledAt` ascending by default

Lesson card fields:

- Subject
- Date/time
- Duration
- Counterparty identifier (npub or profile name if available)
- Status badge

3. Status Transitions
Allowed statuses:

- `scheduled`
- `completed`
- `cancelled`

Status update flow:

- Publish a new replaceable kind-30006 event
- Keep the same `d` tag (`lessonId`)
- Update `content.status`

4. Optional Personal Notes (MVP)
User may attach a personal note to a lesson.

Option A (MVP):

- Store in local storage
- Key format: `lesson-note:<lessonId>:<viewerPubkey>`

Option B (Future):

- Encrypted Nostr event kind 30007

5. Non-Goals

- No payment processing
- No automatic calendar integration
- No push notifications
- No conflict resolution logic

6. Acceptance Criteria (Definition of Done)

- On booking acceptance, tutor publishes one kind-30006 lesson agreement event.
- Both tutor and student can see the same lesson in dashboard cards.
- Updating lesson status republishes kind-30006 with the same `d` tag and new status.
- `30005` blog post behavior remains unchanged.
- No direct relay calls from UI components; Nostr logic remains in hooks/services.
