# Hooks — React Orchestration

React hooks that wire application use cases, repositories, and UI state together. The bridge between React and business logic.

## Infrastructure (not hooks)

These are not hooks but live here as they are consumed by every hook:

| File | Purpose |
|------|---------|
| `RepoContext.tsx` | DI container — creates and provides all repository adapters via React context |
| `NotificationContext.tsx` | React context wrapping `NotificationManager` (toast/notification service) with audio init on first gesture |
| `hookTypes.ts` | Type re-export bridge — components import port event types from here, not from `ports/` |

## Hooks by group

| Group | Hooks | Purpose |
|-------|-------|---------|
| **Controller** | `useAppController`, `useAppActions`, `useAuthController`, `useAppNavigation`, `useAppViewModel` | Top-level orchestrator, action dispatcher, auth lifecycle, navigation state, derived view models |
| **Profile & Schedule** | `useTutorProfile`, `useTutorDirectory`, `useTutorSchedule`, `useTutorSchedules`, `useSlotFilter` | Profile read/write, directory search, schedule CRUD, slot filtering (future/availability) |
| **Bookings** | `useBookings`, `useBookingActions`, `useBookingRequestsForTutor`, `useMyBookingRequests`, `useBookingStatusesForUser`, `useBookingEventsRepository` | Booking lifecycle: request, status events, accept/reject, incoming/outgoing filtering |
| **Lessons** | `useLessons`, `useLessonNote`, `useLessonAgreementsForUser`, `useLessonAgreementEventsRepository`, `useLessonRepository` | Lesson lifecycle: fetch, subscribe, note drafting/publishing/sharing |
| **Messages & Chat** | `usePrivateMessagingActions`, `usePrivateMessagingRepository`, `useEncryptedMessages`, `useMessageIndicators`, `useMessageComposer` | Encrypted DMs (NIP-44/04), message composer UI state, unread badge tracking |
| **Blog & Media** | `useTutorBlog`, `useMyBlog`, `useEditorImageUpload` | Published posts (read-only), own blog CRUD, Blossom image upload for editors |
| **Moderation & Reviews** | `useModeration`, `useContentFilter`, `useReviewsForSubject`, `usePublishReview` | Mute lists (NIP-51), reports (NIP-56), review subscription (kind 32267), reputation scoring |
| **Relays** | `useRelays`, `useRelayList`, `usePublishRelayList` | User relay list management, NIP-65 resolution, relay persistence |
| **Auth** | `useNostrKeypair`, `useNip55Callback` | Current session keypair, NIP-55 Android signer callback URL parsing |
| **Utilities** | `useClickOutside`, `useCurrentTime`, `useHint`, `useNewArrivalIndicator`, `useNotificationCursor`, `useShare`, `useBlossomConfig`, `usePublicAllocatedSlots`, `useRequestsTabViewModel`, `useProgressEntries` | Click-outside detection, interval clock, contextual hints, arrival badges, notification cursor, lesson note sharing, Blossom URL config, slot occupancy, requests tab VM, encrypted progress logs |

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

### `useAppController`

The composition root of all feature hooks. Accepts `onLogout`, `viewerRole`, and `blossomUrl`, and returns a unified API consumed by `App.tsx`:

| Return field | Description |
|-------------|-------------|
| `navigation` | Tab/selection/browser history state from `useAppNavigation` |
| `relay`, `keypair`, `profileState`, `scheduleState`, `directoryState`, `schedulesState` | Relay list, session keypair, profile/schedule/directory derived state |
| `bookingsState`, `lessonsState`, `blogState`, `lessonNoteState`, `messagesState` | Feature-state objects from respective hooks |
| `publicAllocationState` | Slot occupancy from `usePublicAllocatedSlots` |
| `messageIndicators` | Unread counts per surface |
| `stateLoading` | Aggregate loading flag |
| `actions` | Dispatchers for booking/lesson/review/schedule actions (from `useAppActions`) |
| `moderation` | Mute/report state and callbacks |
| `requestActions` | `respondToRequestById`, `cancelRequestById` |
| `viewModel`, `requestsTabViewModel` | Derived view data |
| `publishBookingRequest`, `publishReview` | Top-level action callbacks |
| `requestsUnreadCount`, `lessonsUnreadCount`, `isNewLesson` | Badge data for tab indicators |

### `useModeration`

Manages mute lists (NIP-51) with optimistic updates and provides access to the report repository (NIP-56). Accepts `pubkey` and `viewerRole`. Returns:

| Return | Description |
|--------|-------------|
| `mutedPubkeys` | `Set<string>` — currently muted pubkeys |
| `addMute` | `(target: string) => Promise<void>` — optimistic add, rollback on failure |
| `removeMute` | `(target: string) => Promise<void>` — optimistic remove, rollback on failure |
| `isMuted` | `(pubkey: string) => boolean` |
| `reportUser` | `(target, category, comment) => Promise<void>` — publish NIP-56 report |
| `muteListEvents` | Raw `MuteListEvent[]` for advanced inspection |

### `useMyBlog`

Own blog CRUD for the authenticated user. Accepts `pubkey` and `viewerRole`. Returns:

| Return | Description |
|--------|-------------|
| `posts` | `BlogPost[]` — published posts from store |
| `drafts` | `BlogDraft[]` — saved drafts from repository |
| `loading`, `error` | Loading/error states |
| `publish` | `(post: BlogDraft) => Promise<void>` — publish with optimistic add |
| `saveDraft` | `(draft: BlogDraft) => Promise<void>` |
| `deletePost` | `(postId: string) => Promise<void>` — with optimistic remove |
| `deleteDraft` | `(draftId: string) => Promise<void>` |
| `refresh` | `() => Promise<void>` — re-fetch posts and drafts from relay |

## Dependency rules

- Adapters are accessed through `RepoContext` (`useRepo()`)
- Port event types for components are re-exported through `hookTypes.ts`
- UI components import hooks, never use cases or repositories directly
- **Exception:** some hooks import from `../nostr/` directly when the operation is inherently Nostr-bound (e.g., auth role discovery, lesson subscriptions, relay list operations). These are documented in the nostr/ README as an acknowledged deviation from Clean Architecture — the Nostr transport dependency is intentional and kept local rather than abstracted behind an adapter layer.
- Role-aware hooks default to `"tutor"` for backward compat; `useAppController` passes the actual role
- Context providers (`RepoContext`, `NotificationContext`) are not hooks but live here for proximity to consumers
