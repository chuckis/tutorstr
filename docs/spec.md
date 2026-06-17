# Tutor Hub over Nostr — MVP Technical Specification

## 1. Overview
Tutor Hub over Nostr is a decentralized tutoring platform built on top of the Nostr protocol.
Identity, content, and interactions are represented as Nostr events. The platform consists of
a PWA frontend and a custom relay optimized for tutor discovery and scheduling.

## 2. Goals
- Decentralized identity via Nostr keys (npub / nsec)
- Tutor profiles and schedules published as Nostr events
- Student booking and progress tracking
- Private messaging between tutors and students
- PWA-first experience (desktop + mobile)

## 3. Out of Scope (MVP)
- Built-in crypto escrow
- Video/audio calls
- Reputation and rating system
- Arbitration and dispute resolution

## 4. User Roles

MVP ships with **two roles** (`tutor` and `student`) and a **1:1 binding between
an `npub` and a role**. A given keypair acts as exactly one role for the lifetime
of that account; multi-role, role switching, and role recovery on foreign clients
are out of scope (see §4.6 and the design notes in
`docs/plans/role_separation_tutor_student.md`).

The role is **stored in the local vault** of the creating client and **published
in the user's `kind 0` profile event** (both in `content.role` and
`["t", "role:tutor|student"]` tag). This allows role discovery for extension
(NIP-07) and remote signer (NIP-46) users who have no vault. There is no
dedicated role-only event (`kind 30007`) — the role lives on the profile event,
which is the natural home for it.

### 4.1 Tutor
- Publish and update profile (`kind 0`)
- Publish and update availability schedule (`kind 30001`)
- Accept, reject, or cancel booking requests (`kind 30003`)
- Mark lessons as completed or cancelled (`kind 30006`)
- Communicate privately with students
- Publish public blog posts (`kind 30005`, reserved)

### 4.2 Student
- Browse tutor directory
- Send booking requests for a published slot (`kind 30002`)
- Cancel own pending booking requests
- Track personal learning progress (`kind 30004`, encrypted)
- Communicate privately with tutors
- Publish a simplified public profile (`kind 0`, without `subjects` /
  `hourlyRate`)

### 4.3 Visitor (logged out)
- Browse tutor profiles and blog posts
- Read-only access to public information
- Cannot publish events, request lessons, or send messages

### 4.4 Permission matrix (MVP)

| Action | Tutor | Student | Enforced in |
| --- | :-: | :-: | --- |
| Publish `kind 0` (profile) | yes | yes (subset of fields) | use case + form |
| Publish `kind 30001` (schedule) | yes | **no** | `PublishTutorSchedule` guard |
| Send `kind 30002` (booking request) | **no** | yes | `CreateBookingRequest` guard |
| Accept / reject `kind 30003` | yes | **no** | `AcceptBooking` guard |
| Cancel `kind 30003` (`accepted` only) | yes | **no** | `CancelBooking` (tutor branch) |
| Cancel `kind 30003` (`pending` only) | **no** | yes | `CancelBooking` (student branch) |
| `kind 30006` → `completed` / `cancelled` | yes | **no** | `ChangeLessonStatus` guard |
| `kind 30004` (progress log) | yes | yes | symmetric |
| `kind 4` (DM, NIP-04) | yes | yes | symmetric |
| `kind 30005` (blog post) | yes | **no** | reserved for tutor |
| Discover tab content | tutors only (filter on `kind 0`) | tutors only | `useTutorDirectory` |
| `Requests` segment `incoming` | rendered | **not rendered** | `useAppNavigation` + `RequestsTab` |
| `Requests` segment `outgoing` | rendered | rendered | both |
| `Profile` form fields | full | `name`, `bio`, `avatarUrl`, `languages` only | `ProfileForm` `mode` |
| `Profile` tab — `ScheduleForm` | rendered | **not rendered** | `DashboardTab` `mode` |
| `Profile` tab — tutor metrics | rendered | **not rendered** | `DashboardTab` `mode` |
| `Discover` chat with selected tutor | — | full (read + write) | `DiscoverTab` `role` |
| `Discover` announcements from selected tutor | read-only | — | `DiscoverTab` `role` |

UI hooks that surface role to consumers: `useAppNavigation(role)`,
`useMessageIndicators(... , role)`, `useTutorSchedule(pubkey, role)`. The
controller passes the same role into every component that needs to branch.

### 4.5 Onboarding and role selection

- **Create flow**: welcome → create → master password → **role pick** → nsec
  reveal → app. The role pick step offers two radio cards (tutor / student)
  with a short description of each; the "Continue" button is disabled until
  one is selected. The role is written to the vault `VaultRecord` as
  `role: "tutor" | "student"` (vault `version` is bumped to `2`).
- **Import flow**: no role-pick step. The role is read from the vault; if the
  imported key has no role on this device (legacy / cross-client import), the
  legacy fallback assigns `role = "tutor"` (see §4.6).
- **NIP-07 extension flow**: user connects via browser extension. No vault
  entry exists. The app subscribes to `kind 0` for the user's pubkey. If a
  profile with a `role` tag is found, the role is resolved from it. If not,
  the user is prompted to pick a role.
- **Unlock flow**: unchanged; role is restored from the vault.

### 4.6 Out of scope for MVP (noted, not implemented)

- Switching role for an existing `npub` — the user must create a new account.
- `1:N` mapping (`npub` with both roles) — single role only.
- Publishing the role in a dedicated Nostr event (`kind 30007` Account). The
  role may appear in the user's `kind 0` profile event (content + tags), which
  is the natural home — not in a separate kind.
- Verifying a counterparty's role from a remote event. Tutors and students
  are trusted to publish what they publish; the only check is the local
  guard.
- Cross-client role recovery — importing an `nsec` on a clean client always
  yields `role = "tutor"` as a safe default; in MVP every existing account
  is a tutor, so this is benign. Student role recovery is a separate
  onboarding task outside this MVP.
- Onboarding of tutors-as-students (and vice versa) — same as role
  switching; out of scope.

## 5. Architecture

Frontend:
- TypeScript
- React
- Vite
- PWA (Service Worker)
- nostr-tools

Backend:
- Custom Nostr Relay (Khatru, in `relay/`)
- Go
- WebSocket

Storage:
- In-memory (slicestore) for development; persistent (LMDB/PostgreSQL) for production

## 6. Nostr Event Kinds

| Kind  | Description |
|------:|------------|
| 0 | Metadata (NIP-01; replaces `kind 30000` — see §7.1) |
| 30001 | Tutor Schedule (replaceable; tutor-only publish) |
| 30002 | Booking Request (student-only publish) |
| 30003 | Booking Status |
| 30004 | Progress Log (encrypted) |
| 30005 | Tutor Blog Post (reserved; tutor-only publish) |
| 30006 | Lesson Agreement (replaceable per lesson) |

See `docs/nostr-kinds.md` for full NIP-style definitions, tags, and schemas.
The role may appear in the user's `kind 0` profile (content and tags) but not
in a dedicated kind (`kind 30007`). See §4 for the role model.

## 7. Event Definitions

### 7.1 Profile (kind 0, replaces kind 30000)
Standard Nostr metadata event (NIP-01). Used by **both** tutors and students;
only tutors fill the tutor-specific fields. Internal `UserProfile` type uses
`bio`/`avatarUrl`; `serializeProfile()` maps to NIP-01 fields (`about`/`picture`)
on publish.

Content (JSON) — NIP-01 standard + custom extensions:
- `name`: string
- `about`: string (maps to internal `bio`)
- `picture`: string (URL, maps to internal `avatarUrl`)
- `subjects`: string[] (custom, tutor only)
- `languages`: string[] (custom)
- `hourlyRate`: number (custom, tutor only)
- `role`: "tutor" | "student" (custom)
- `availabilityMode`: "remote" | "offline" | "hybrid" (custom, tutor only)
- `timezone`: string (custom, IANA, tutor only)
- `workHours`: string (custom, tutor only)

Tags:
- `["t", "schema:1"]` — content schema version
- `["t", "role:tutor"]` or `["t", "role:student"]` — role for relay filtering
- `["t", "subject:<subject>"]` (repeat per subject)
- `["t", "language:<language>"]` (repeat per language)
- `["t", "mode:<mode>"]` (tutor only)

### 7.2 Tutor Schedule (kind 30001)
Replaceable event.

Content:
- timezone
- available time slots

### 7.3 Booking Request (kind 30002)
Addressed to tutor.

Tags:
- p: <tutor_npub>

Content:
- requested slot
- student message

### 7.4 Booking Status (kind 30003)
Replaceable per booking.

Content:
- status: accepted | rejected | completed

### 7.5 Student Progress Log (kind 30004)
Encrypted using NIP-04 or NIP-44.

Content:
- lesson topic
- notes
- progress score

### 7.6 Tutor Blog Post (kind 30005)
Public post authored by tutor.

### 7.7 Lesson Agreement (kind 30006)
Replaceable per lesson (`d` tag).

Content:
- lessonId
- bookingId
- subject
- scheduledAt
- durationMin
- price
- currency
- status: scheduled | completed | cancelled

Tags:
- d: <lesson_id>
- p: <tutor_pubkey>
- p: <student_pubkey>
- e: <booking_request_event_id>

## 8. Frontend Requirements
- Key generation and import
- Relay connection management
- Tutor directory with filters
- Tutor profile pages
- Booking request flow
- Messaging UI
- Student dashboard
- Offline support (PWA)

## 9. Relay Requirements
- Support standard NIP-01
- Support encrypted events
- Event indexing by kind and tags
- Rate limiting and spam protection
- Soft moderation (npub deny list)

## 10. Payments
MVP:
- External payment links in tutor profiles

Future:
- Lightning Network
- On-chain crypto payments
- Optional escrow service

## 11. Success Criteria
- Tutor can publish profile and schedule
- Student can discover tutor and book lesson
- Tutor can accept booking
- Private communication works
- Application installs as PWA

## 12. Suggested Repository Structure

/frontend
  /src
  /components
  /pages
  /services/nostr
  /pwa

/relay
  /src
  /storage
  /indexer

/docs
  spec.md
