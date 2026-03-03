
# Technical Specification

## Mobile PWA Layout & Unified Role Logic

---

## 1. Objective

Refactor the current single-screen overloaded interface into a structured mobile-first PWA layout.

The application must:

* Use tab-based navigation.
* Maintain identical top-level tabs for all users.
* Support multiple roles (student, tutor, future arbitrator) under a single pubkey.
* Adjust behavior and visible actions dynamically based on the user’s relation to data.
* Avoid separate “Tutor UI” and “Student UI”.

---

## 2. Core Principles

1. Single pubkey can act as:

   * student
   * tutor
   * arbitrator (future extension)

2. No role switching toggle.

3. UI behavior is derived from:

   * event tags
   * lesson relation (is user tutor? student? neither?)

4. Tabs remain structurally identical for all users.

---

## 3. Navigation Structure (Mobile PWA)

Bottom navigation with 4 tabs:

* Discover
* Requests
* Lessons
* Profile

No nested primary navigation levels.
Maximum routing depth: 1 level.

---

## 4. Tab Specifications

---

### 4.1 Discover Tab

### Purpose

User exploration and profile visibility.

### Behavior

If user is browsing others:

* Show searchable tutor list.
* Each tutor card:

  * Name
  * Subjects
  * Price
  * “View Profile”

If user views own profile:

* Show “Public Profile Preview”
* Allow editing profile data.

Discover tab must:

* Never show booking requests.
* Never show lesson status.
* Be purely exploration mode.

---

### 4.2 Requests Tab

### Purpose

Handle booking negotiations.

### Data Sources

Booking events (e.g. kind 30002).

### Layout

Segmented control:

* Incoming
* Outgoing

Filtering logic:

Incoming:

* Booking requests where user pubkey is tagged as tutor.

Outgoing:

* Booking requests where user pubkey is author.

Card contents:

* Subject
* Scheduled date
* Counterparty
* Status (pending / accepted / declined)

Actions:

If user is tutor:

* Accept
* Decline

If user is student:

* Cancel (optional MVP)

No lesson lifecycle actions here.

---

### 4.3 Lessons Tab (Primary Domain Screen)

### Purpose

Display persistent lesson agreements.

### Data Source

Lesson agreement events (e.g. kind 30006).

### Layout

Segmented control:

* Upcoming
* Past

Filtering rules:

Upcoming:

* status = scheduled
* scheduled_at >= now

Past:

* status = completed OR scheduled_at < now

Card contains:

* Subject
* Date/time
* Counterparty
* Status badge

---

### Lesson Details Screen

Accessible from Lessons tab.

Must include:

* Full lesson metadata
* Status indicator
* Role-based actions

Role-based logic:

If user is tutor:

* Mark completed
* Cancel

If user is student:

* Cancel (if allowed)
* Add personal note (local storage MVP)

If future arbitrator:

* View metadata only (MVP)
* No modification rights

Status updates must:

* Publish new replaceable lesson event
* Keep same "d" tag

---

### 4.4 Profile Tab

### Purpose

Identity and configuration.

Must include:

* Profile editing
* Schedule editing
* Relay configuration
* Logout

No lesson-related actions here.

---

## 5. Role Resolution Logic

Role is not stored as a user setting.

Role is inferred per event:

For booking events:

* If user pubkey == tutor tag → role = tutor
* If user pubkey == author → role = student

For lesson agreement events:

* If pubkey matches tutor tag → user acts as tutor
* If pubkey matches student tag → user acts as student
* Otherwise → no action rights

Future extension:

* Arbitrator role inferred via specific tag:
  ["arbitrator", "<pubkey>"]

UI must not assume single global role.

---

## 6. State Model

High-level lifecycle:

Discover
→ Booking request
→ Accepted
→ Lesson agreement created
→ Scheduled
→ Completed / Canceled

UI must reflect lifecycle stages through tab placement.

---

## 7. Mobile PWA Requirements

* Bottom navigation fixed.
* Touch targets minimum 48px height.
* No side drawer navigation.
* No more than one primary CTA per screen.
* All detail screens full-screen (no complex nested routing).

---

## 8. Non-Goals (MVP)

* No payment system
* No arbitration UI (future only)
* No messaging system
* No calendar integration
* No push notifications

---

## 9. Design Constraints

* Avoid duplicated UI for roles.
* Avoid conditional rendering of entire tabs.
* Only conditional rendering of actions inside cards.
* One domain entity: Lesson Agreement.

---

## 10. Future Extensions (Not Implemented Now)

* Arbitrator workflow
* Escrow logic
* Conflict state in lesson lifecycle
* Encrypted lesson notes via Nostr

---
