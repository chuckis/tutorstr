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
| Bookings | `useBookings`, `useBookingActions`, `useBookingRequestsForTutor`, `useMyBookingRequests`, `useBookingStatusesForUser` | Booking lifecycle |
| Lessons | `useLessons`, `useLessonNote`, `useLessonAgreementsForUser`, `useLessonAgreementEventsRepository`, `useLessonRepository` | Lesson lifecycle |
| Messages | `usePrivateMessagingActions`, `usePrivateMessagingRepository`, `useEncryptedMessages`, `useMessageIndicators` | Encrypted DMs |
| Other | `useRelays`, `useNostrKeypair`, `usePublicAllocatedSlots`, `useProgressEntries`, `useRequestsTabViewModel`, `useBookingEventsRepository` | Utilities |

## Dependency rules

- Hooks **never** import from `../nostr/` or `../adapters/` directly
- Adapters are accessed only through `RepoContext` (`useRepo()`)
- Port event types for components are re-exported through `hookTypes.ts`
- UI components import hooks, never use cases or repositories directly
- Role-aware hooks default to `"tutor"` for backward compat; `useAppController` passes the actual role
