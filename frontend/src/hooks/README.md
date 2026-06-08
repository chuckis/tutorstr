# Hooks — React Orchestration

React hooks that wire application use cases, repositories, and UI state together. The bridge between React and business logic.

## Key files

| File | Purpose |
|------|---------|
| `RepoContext.tsx` | DI container — creates and provides all repository adapters via React context |
| `hookTypes.ts` | Type re-export bridge — components import port event types from here, not from `ports/` |
| `useAppController.ts` | Top-level orchestrator, wires all hooks together |

## Key hooks

| Group | Hooks | Purpose |
|-------|-------|---------|
| Controller | `useAppController`, `useAuthController`, `useAppNavigation`, `useAppViewModel` | App-wide state, navigation |
| Profile | `useTutorProfile`, `useTutorDirectory`, `useTutorSchedule`, `useTutorSchedules` | Profile/schedule read/write |
| Bookings | `useBookings`, `useBookingActions`, `useBookingRequestsForTutor`, `useMyBookingRequests`, `useBookingStatusesForUser`, `useBookingEventsRepository` | Booking lifecycle |
| Lessons | `useLessons`, `useLessonNote`, `useLessonAgreementsForUser`, `useLessonAgreementEventsRepository`, `useLessonRepository` | Lesson lifecycle |
| Messages | `usePrivateMessagingActions`, `usePrivateMessagingRepository`, `useEncryptedMessages`, `useMessageIndicators` | Encrypted DMs |
| Other | `useRelays`, `useNostrKeypair`, `usePublicAllocatedSlots`, `useProgressEntries`, `useRequestsTabViewModel`, `useBlossomConfig`, `useShare` | Utilities |

### `useLessonNote`

Orchestrates lesson note state for the selected lesson. Wires `SendLessonNote` and `ShareLessonNote` use cases, manages Nostr subscription, and returns:

| Return value | Type | Description |
|-------------|------|-------------|
| `lessonNote` | `string` | Current editor content |
| `setLessonNote` | `(v: string) => void` | Update editor content |
| `saveNoteLocally` | `() => void` | Persist to localStorage |
| `publishNote` | `() => Promise<void>` | Publish encrypted backup to self |
| `shareNoteWithCounterparty` | `(pk: string) => Promise<void>` | Share with counterparty |
| `publishStatus` | status enum | `"idle" \| "saving" \| "published" \| "error"` |
| `shareStatus` | status enum | `"idle" \| "saving" \| "shared" \| "error"` |
| `sharedNotes` | `LessonNote[]` | Notes from counterparty |
| `sharedNotesStatus` | status enum | Loading/idle/empty/received/error |
| `noteList` | `LessonNoteWithVisibility[]` | All notes merged with visibility chips |

The `noteList` field merges local saved drafts, self-published notes, and counterparty notes into a single sorted list with per-entry `visibility: NoteVisibility[]` (`"saved"`, `"published"`, `"shared"`). This drives the `LessonNoteList` and `LessonNoteDetail` components.

## Dependency rules

- Hooks **never** import from `../nostr/` or `../adapters/` directly
- Adapters are accessed only through `RepoContext` (`useRepo()`)
- Port event types for components are re-exported through `hookTypes.ts`
- UI components import hooks, never use cases or repositories directly
- Role-aware hooks default to `"tutor"` for backward compat; `useAppController` passes the actual role
