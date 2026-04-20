
# 📄 Technical Specification (for Codex)

## Refactor: Decouple Business Logic from Nostr (Incremental)

---

## 1. Objective

Refactor the existing frontend codebase to decouple business logic from Nostr-specific structures.

The goal is to:

* Introduce a **domain layer (Booking, Lesson, etc.)**
* Ensure UI components and hooks do not depend on:

  * Nostr event kinds
  * raw tags
  * raw event structures
* Keep existing UI structure and components intact
* Perform **incremental refactor**, not full rewrite

---

## 2. Constraints

* DO NOT rewrite the entire app
* DO NOT remove existing hooks immediately
* DO NOT change UI layout (Tabs, components stay)
* DO introduce new layers and migrate progressively
* Nostr must become an implementation detail

---

## 3. New Directory Structure (to add)

Create new folders inside `/src`:

```
/domain
  booking.ts
  lesson.ts

/ports
  bookingRepository.ts
  lessonRepository.ts

/adapters
  nostr/
    bookingAdapter.ts
    lessonAdapter.ts

/application
  usecases/
    acceptBooking.ts
```

---

## 4. Domain Models

### `/domain/booking.ts`

```ts
export type Booking = {
  id: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  status: "pending" | "accepted" | "rejected";
};
```

---

### `/domain/lesson.ts`

```ts
export type Lesson = {
  id: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  status: "scheduled" | "completed" | "canceled";
};
```

---

## 5. Repository Interfaces (Ports)

### `/ports/bookingRepository.ts`

```ts
import { Booking } from "../domain/booking";

export interface BookingRepository {
  getIncoming(userId: string): Promise<Booking[]>;
  getOutgoing(userId: string): Promise<Booking[]>;
  getById(id: string): Promise<Booking | null>;
  updateStatus(id: string, status: Booking["status"]): Promise<void>;
}
```

---

### `/ports/lessonRepository.ts`

```ts
import { Lesson } from "../domain/lesson";

export interface LessonRepository {
  getForUser(userId: string): Promise<Lesson[]>;
  save(lesson: Lesson): Promise<void>;
}
```

---

## 6. Nostr Adapters

### `/adapters/nostr/bookingAdapter.ts`

Responsibilities:

* Convert Nostr events → Booking
* Convert Booking → Nostr events

Must use existing helpers:

* `/nostr/client.ts`
* `/utils/nostrTags.ts`

---

### `/adapters/nostr/lessonAdapter.ts`

Same pattern for lessons.

---

## 7. Use Case: Accept Booking

### `/application/usecases/acceptBooking.ts`

```ts
import { BookingRepository } from "../../ports/bookingRepository";
import { LessonRepository } from "../../ports/lessonRepository";

export class AcceptBooking {
  constructor(
    private bookingRepo: BookingRepository,
    private lessonRepo: LessonRepository
  ) {}

  async execute(bookingId: string) {
    const booking = await this.bookingRepo.getById(bookingId);
    if (!booking) return;

    await this.bookingRepo.updateStatus(bookingId, "accepted");

    await this.lessonRepo.save({
      id: crypto.randomUUID(),
      tutorId: booking.tutorId,
      studentId: booking.studentId,
      scheduledAt: booking.scheduledAt,
      status: "scheduled"
    });
  }
}
```

---

## 8. Hook Refactor Strategy

### Existing hooks (DO NOT DELETE):

* `useBookingRequestsForTutor.ts`
* `useMyBookingRequests.ts`
* `useLessonAgreementsForUser.ts`

### Step 1:

Wrap them inside repositories.

Example:

```ts
// adapters layer uses existing hook logic internally
```

### Step 2:

Create new hook:

```
/hooks/useBookings.ts
```

```ts
export function useBookings() {
  // uses BookingRepository internally
}
```

### Step 3:

Gradually migrate UI components:

Replace:

```ts
useBookingRequestsForTutor()
```

With:

```ts
useBookings()
```

---

## 9. UI Refactor Rules

### Components MUST NOT:

* Access raw nostr events
* Read `event.kind`
* Parse tags directly

### Components MUST:

* Work with:

  * Booking
  * Lesson

---

## 10. Affected Components

Update these first:

* `BookingRequestsPanel.tsx`
* `RequestsTab.tsx`
* `LessonAgreementsPanel.tsx`
* `LessonsTab.tsx`

---

## 11. Anti-Patterns to Avoid

* ❌ Passing raw Nostr events into components
* ❌ Parsing tags inside UI
* ❌ Mixing domain logic inside hooks

---

## 12. Definition of Done

* UI renders using domain models only
* Nostr logic isolated in `/adapters`
* Hooks expose domain objects
* AcceptBooking flow works end-to-end
* No regression in UI behavior

---

## 13. Migration Strategy

1. Add domain + ports
2. Add adapters (wrap existing logic)
3. Implement AcceptBooking use case
4. Introduce new hooks
5. Migrate UI gradually


