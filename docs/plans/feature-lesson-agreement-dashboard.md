Technical Specification (for Codex)
Feature: Lesson Agreement & Dashboard Card
Objective

Persist accepted bookings as structured lesson agreements and display them as dashboard cards for both tutor and student.

1. Lesson Agreement Event
Trigger

Tutor accepts a booking request (kind 30002).

Action

Create a new Nostr event of kind 30005.

Event Structure
{
  "kind": 30005,
  "pubkey": "<tutor_pubkey>",
  "tags": [
    ["tutor", "<tutor_pubkey>"],
    ["student", "<student_pubkey>"],
    ["booking", "<booking_event_id>"],
    ["d", "<unique_lesson_id>"]
  ],
  "content": {
    "subject": "Math lesson",
    "scheduled_at": "2026-02-20T15:00:00Z",
    "duration_min": 60,
    "price": 50,
    "currency": "USD",
    "status": "scheduled"
  }
}


Event must be:

addressable (has "d" tag)

replaceable per lesson

2. Dashboard View
Requirements

Frontend must:

Subscribe to kind 30005

Filter events where:

user pubkey matches tutor OR student tag

Sort by scheduled_at

UI Card Fields

Subject

Date/time

Duration

Counterparty name

Status badge

3. Status Transitions

Allowed statuses:

scheduled

completed

canceled

Status update:

publish new replaceable event

keep same d tag

update status field

4. Optional: Personal Notes (MVP)

User may attach a note to a lesson.

Option A (MVP):

Store in local storage

Keyed by lesson event id

Option B (Future):

Encrypted Nostr event kind 30006

5. Non-Goals

No payment processing

No automatic calendar integration

No push notifications

No conflict resolution logic