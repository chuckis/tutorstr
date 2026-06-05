# Student Profile View — Card + Detail page

## Motivation

When a tutor views a student's profile from a booking request detail
(RequestTab → "View Profile"), the app shows the **tutor detail layout**
in DiscoverTab: hourlyRate, subjects chips, published slots, booking form,
availability mode — none of which apply to a student.

The student also needs a dedicated profile card component for future use
(e.g. student directory, lesson participant info).

## Root cause

1. `navigateToProfileFromRequest` (`useAppNavigation.ts:48`) stores ANY
   profile as `selectedTutor` — no role check.
2. `DiscoverTab.tsx:103-222` renders one layout regardless of
   `selectedTutor.profile.role`.
3. Avatar at line 117 hardcodes `role="tutor"`.
4. `CounterpartyCard.tsx:48-54` shows subjects chips unconditionally,
   even for student counterparties.

## Scope

| Layer | File | Change |
|-------|------|--------|
| `components/` | `StudentProfileCard.tsx` | **New** — simple student card |
| `components/` | `StudentDetailView.tsx` | **New** — full student profile detail |
| `components/` | `DiscoverTab.tsx` | Branch on `profile.role` in detail view |
| `components/` | `CounterpartyCard.tsx` | Hide subjects for students |
| `hooks/` | `useAppNavigation.ts` | No rename — downstream handles it |
| `App.tsx` | — | Minor comment, no code change |

## Step-by-step

### Step 1 — `StudentProfileCard.tsx`

Same shape as `TutorCard` but:
- No `hourlyRate`, `availabilityMode`, mode label
- No subjects chips
- Avatar `role` from `entry.profile.role ?? "student"`
- Shows: avatar, name, bio, languages, npub

### Step 2 — `StudentDetailView.tsx`

Full detail page wrapped in `DetailPageLayout`:
- Avatar, name, bio, languages
- Chat area (when viewer is tutor — can message the student)
- **NO**: hourlyRate, subjects chips, published slots, booking request form
- Takes `selectedProfile: UserProfileEvent`, `viewerRole`, `onBack`, `onSendMessage`, etc.

### Step 3 — `DiscoverTab.tsx` role branch

In the `selectedTutor` branch (line 103):
```ts
const isStudentView = selectedTutor.profile.role === "student";

if (isStudentView) {
  // render <StudentDetailView ... />
}

// else: existing tutor detail layout
```

Fix Avatar role:
```ts
role={selectedTutor.profile.role ?? "tutor"}
```

### Step 4 — `CounterpartyCard.tsx`

Wrap subjects chips (line 48) with `role === "tutor"` condition.

### Step 5 — Verify

- `npm run typecheck` — no type errors
- Login as tutor → open a booking request → "View Profile" on a student →
  sees student-appropriate view (no rate, subjects, slots, booking form)
- Login as tutor → select a tutor card in Discover → sees full tutor detail
- `npm run test` — all tests pass
