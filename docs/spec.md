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

### 4.1 Tutor
- Publish and update profile
- Publish and update availability schedule
- Accept or reject booking requests
- Communicate privately with students
- Publish public blog posts

### 4.2 Student
- Browse tutor directory
- Request lesson bookings
- Track personal learning progress
- Communicate privately with tutors

### 4.3 Visitor
- Browse tutor profiles and blog posts
- Read-only access

## 5. Architecture

Frontend:
- TypeScript
- React
- Vite
- PWA (Service Worker)
- nostr-tools

Backend:
- Custom Nostr Relay
- TypeScript (Node.js / Bun / Deno)
- WebSocket

Storage:
- SQLite or LevelDB

## 6. Nostr Event Kinds

| Kind  | Description |
|------:|------------|
| 30000 | Tutor Profile (replaceable) |
| 30001 | Tutor Schedule (replaceable) |
| 30002 | Booking Request |
| 30003 | Booking Status |
| 30004 | Student Progress Log (encrypted) |
| 30005 | Tutor Blog Post |
| 30006 | Lesson Agreement (replaceable per lesson) |

See `docs/nostr-kinds.md` for full NIP-style definitions, tags, and schemas.

## 7. Event Definitions

### 7.1 Tutor Profile (kind 30000)
Replaceable event.

Content (JSON):
- name
- bio
- subjects
- languages
- hourlyRate
- avatarUrl

Tags:
- role:tutor
- subject:*

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
