# Hooks — React Orchestration

React hooks that wire application use cases, repositories, and UI state together. The bridge between React and business logic.

## Key hooks

| Group | Hooks | Purpose |
|-------|-------|---------|
| Controller | `useAppController`, `useAuthController`, `useAppNavigation`, `useAppViewModel` | App-wide state, navigation |
| Profile | `useTutorProfile`, `useTutorDirectory`, `useTutorSchedule`, `useTutorSchedules` | Profile/schedule read/write |
| Bookings | `useBookings`, `useBookingActions`, `useBookingRequestsForTutor`, `useMyBookingRequests`, `useBookingStatusesForUser` | Booking lifecycle |
| Lessons | `useLessons`, `useLessonNote`, `useLessonAgreementsForUser`, `useLessonAgreementEventsRepository`, `useLessonRepository` | Lesson lifecycle |
| Messages | `usePrivateMessagingActions`, `usePrivateMessagingRepository`, `useEncryptedMessages`, `useMessageIndicators` | Encrypted DMs |
| Other | `useRelays`, `useNostrKeypair`, `usePublicAllocatedSlots`, `useProgressEntries`, `useRequestsTabViewModel`, `useBookingEventsRepository` | Utilities |

## Rules

- Hooks orchestrate — they import use cases, repositories, and call them
- UI components import hooks, never use cases or repositories directly
- Role-aware hooks default to `"tutor"` for backward compat; `useAppController` passes the actual role
