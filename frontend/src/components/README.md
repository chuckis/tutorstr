# Components — UI Layer

React components and tab screens. Pure presentation — no direct Nostr or localStorage access.

## Tab screens

| Component | Tab | Role-aware? |
|-----------|-----|-------------|
| `DiscoverTab.tsx` | Discover | Yes — student sees chat; tutor sees collapsed + announcements |
| `RequestsTab.tsx` | Requests | Yes — no incoming segment for students |
| `LessonsTab.tsx` | Lessons | Yes — role-based actions |
| `DashboardTab.tsx` | Profile | Yes — no schedule/metrics for students |

## Shared components

| Component | Purpose |
|-----------|---------|
| `AuthScreen.tsx` | Welcome, create/import/unlock/role-pick |
| `ProfileForm.tsx` | Profile editor (role-aware) |
| `ScheduleForm.tsx` | Schedule editor (tutor only) |
| `TutorCard.tsx` | Tutor card in discover list |
| `TutorProfileView.tsx` | Full tutor detail |
| `BookingRequestForm.tsx` | Send booking request |
| `RequestCard.tsx` | Request list item |
| `MessageComposer.tsx` | Message input |
| `MessageThread.tsx` | Message display |
| `BottomNav.tsx` | 4-tab navigation |
| `Tabs.tsx` | Segmented control |

## Rules

- Components receive data via props from hooks (not directly from repositories)
- Role branching uses a `role: AccountRole` prop, not direct auth reads
- No imports from `nostr/`, `adapters/`, or `ports/`
- Port event types (e.g. `TutorProfileEvent`) are imported from `../hooks/hookTypes`, never from `../ports/`
