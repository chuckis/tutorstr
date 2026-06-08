# Components — UI Layer

React components and tab screens. Pure presentation — no direct Nostr or localStorage access.

## Tab screens

| Component | Tab | Role-aware? |
|-----------|-----|-------------|
| `DiscoverTab.tsx` | Discover | Yes — student sees chat; tutor sees collapsed + announcements |
| `RequestsTab.tsx` | Requests | Yes — no incoming segment for students |
| `LessonsTab.tsx` | Lessons | Yes — role-based actions, note sub-navigation (list / detail) |
| `DashboardTab.tsx` | Profile | Yes — no schedule/metrics for students |

## Lesson Note components

| Component | Purpose |
|-----------|---------|
| `LessonNoteEditor.tsx` | Inline textarea with Save / Publish / Share buttons |
| `LessonNoteList.tsx` | All notes for a lesson with visibility chips (saved/published/shared) |
| `LessonNoteDetail.tsx` | Full note content, metadata, and visibility chips |

The note sub-navigation is managed locally in `LessonsTab` via `noteView` / `selectedNoteId` state:

```
Lesson Detail → [View Notes] → Note List → [select] → Note Detail
```

## Shared components

| Component | Purpose |
|-----------|---------|
| `AuthScreen.tsx` | Welcome, create/import/unlock/role-pick |
| `ProfileForm.tsx` | Profile editor (role-aware) |
| `ScheduleForm.tsx` | Schedule editor (tutor only) |
| `DetailPageLayout.tsx` | Shared detail page shell (sticky top bar + scrollable content) |
| `TutorCard.tsx` | Tutor card in discover list |
| `CounterpartyCard.tsx` | Counterparty profile card in requests |
| `BookingRequestForm.tsx` | Send booking request |
| `RequestCard.tsx` | Request list item |
| `RequestDetailsView.tsx` | Request detail with status flow |
| `RequestActionBar.tsx` | Accept/decline buttons |
| `RequestStatusHistory.tsx` | Status timeline |
| `MessageComposer.tsx` | Message input with file attachments |
| `MessageThread.tsx` | Message display |
| `MessageAttachmentPreview.tsx` | File attachment thumbnails |
| `BottomNav.tsx` | 4-tab navigation |
| `Tabs.tsx` | Segmented control |
| `Avatar.tsx` | User avatar with role indicator |
| `ImageViewer.tsx` | Fullscreen image viewer |
| `Spinner.tsx` | Loading indicator |
| `FilterBar.tsx` | Discover filter UI |
| `ShareButton.tsx` | Share profile link |
| `ShareTargetHandler.tsx` | Incoming share target |
| `StudentDetailView.tsx` | Student profile in tutor discovery |
| `StudentProfileCard.tsx` | Student card |
| `IdentityCard.tsx` | npub/nsec display |
| `ProgressEntryForm.tsx` | Progress log form |
| `ProgressEntryList.tsx` | Progress log list |
| `LessonAgreementsPanel.tsx` | Lesson agreement view |
| `LessonsCalendar.tsx` | Calendar view of lessons |
| `RelayConfig.tsx` | Relay URL editor |
| `DashboardSettingsDrawer.tsx` | Settings drawer (profile, relays, logout) |
| `SettingsAbout.tsx` | About section |
| `SettingsFAQ.tsx` | FAQ section |

## Rules

- Components receive data via props from hooks (not directly from repositories)
- Role branching uses a `role: AccountRole` prop, not direct auth reads
- No imports from `nostr/`, `adapters/`, or `ports/`
- Port event types (e.g. `TutorProfileEvent`) are imported from `../hooks/hookTypes`, never from `../ports/`
