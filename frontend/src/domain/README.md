# Domain — Pure Business Logic

Core types, value objects, and pure selectors. Zero dependencies outside this directory.

## Key files

| File | Purpose |
|------|---------|
| `booking.ts` | Booking model, BookingStatus, events |
| `bookingSelectors.ts` | Slot allocation queries, winning bid selection |
| `lesson.ts` | Lesson model, LessonStatus, LessonAgreement |
| `lessonNote.ts` | LessonNote model, LessonNoteType, NoteVisibility |
| `TimeSlot.ts` | Value object `{ start, end }` |
| `slotAllocation.ts` | Allocation/bidding key helpers |
| `slotOccupancy.ts` | SlotOccupancy type |
| `messageThread.ts` | Thread key derivation (DMs, requests, lessons) |
| `messaging.ts` | EncryptedMessage, MessageAttachment types |
| `progress.ts` | ProgressEntry model |
| `account.ts` | AccountRole type, role constants |
| `auth.ts` | AuthSession, VaultRecord, AuthError hierarchy |
| `locale.ts` | AppLocale, supported locales |
| `profile.ts` | UserProfile, AvailabilityMode |
| `avatarDefaults.ts` | Default avatar generation |
| `tutorDirectoryQuery.ts` | Tutor discovery query model |
| `tutorSelectors.ts` | Tutor selection utilities |
| `schedule.ts` | TutorSchedule model |

## Rules

- No imports from outside `domain/`
- No side effects, no I/O
- Pure functions only. Testable without mocks.
