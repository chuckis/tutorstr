# Domain — Pure Business Logic

Core types, value objects, and pure selectors. Zero dependencies outside this directory.

## Key files

| File | Purpose |
|------|---------|
| `account.ts` | AccountRole type, role constants |
| `auth.ts` | AuthSession, VaultRecord, AuthError hierarchy |
| `avatarDefaults.ts` | Default avatar generation |
| `blog.ts` | BlogPost, BlogDraft, BlogPostStatus |
| `booking.ts` | Booking model, BookingStatus, events |
| `bookingSelectors.ts` | Slot allocation queries, winning bid selection |
| `lesson.ts` | Lesson model, LessonStatus, LessonAgreement |
| `lessonNote.ts` | LessonNote model, LessonNoteType, NoteVisibility |
| `locale.ts` | AppLocale, supported locales |
| `messageThread.ts` | Thread key derivation (DMs, requests, lessons) |
| `messaging.ts` | EncryptedMessage, MessageAttachment types |
| `moderation.ts` | MuteList, BlockEntry, Report, ReportLabel |
| `profile.ts` | UserProfile, AvailabilityMode |
| `progress.ts` | ProgressEntry model |
| `relayList.ts` | RelayListItem, RelayList types, cache keys |
| `review.ts` | Review, ReviewRating, ReviewAuthorRole |
| `schedule.ts` | TutorSchedule model |
| `slotAllocation.ts` | Allocation/bidding key helpers |
| `slotOccupancy.ts` | SlotOccupancy type |
| `theme.ts` | Theme type (light/dark), storage key |
| `TimeSlot.ts` | Value object `{ start, end }` |
| `tutorDirectoryQuery.ts` | Tutor discovery query model |
| `tutorSelectors.ts` | Tutor selection utilities |

## Rules

- No imports from outside `domain/`
- No side effects, no I/O
- Pure functions only. Testable without mocks.
