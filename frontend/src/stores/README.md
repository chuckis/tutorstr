# Stores — Zustand State

Zustand stores that hold client-side state populated by hooks and Nostr subscriptions.

## Files

| Store | State | Written by |
|-------|-------|------------|
| `blogStore.ts` | Blog posts (published), optimistic add/remove | `useMyBlog`, `useTutorBlog` |
| `bookingStore.ts` | Raw booking request events + status events | `useBookings` |
| `lessonStore.ts` | Lesson agreements (by id) | `useLessons` |
| `lessonNoteStore.ts` | Lesson notes (local drafts + published + shared) | `useLessonNote` |
| `messageStore.ts` | Encrypted messages grouped by thread | `useEncryptedMessages` |
| `profileStore.ts` | User profiles (kind 0 / kind 30000) | `useTutorProfile`, `useTutorDirectory` |
| `reviewStore.ts` | Reviews (by subject pubkey) | `useReviewsForSubject` |
| `scheduleStore.ts` | Tutor schedules (by pubkey) | `useTutorSchedule`, `useTutorSchedules` |

## Rules

- Stores are updated by hooks, never by components directly
- Components read stores via hooks, not by importing store files
- Optimistic updates: stores expose `optimisticAdd` / `optimisticRemove` where needed
- No business logic in stores — pure state containers
