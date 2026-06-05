# Add `Role` type + `role` field to `UserProfile` + Fix Discover filter

## Motivation

Tutors see students on the Discover tab, violating role separation.

## Root cause

1. `useTutorProfile` (`hooks/useTutorProfile.ts:35`) hardcodes tag `["t", "role:tutor"]` — every auto-published profile gets tagged as tutor, even for students
2. `useTutorDirectory` (`hooks/useTutorDirectory.ts:73`) uses a **negative** filter `!hasRoleTag(entry.tags, "student")` — since student profiles carry `role:tutor`, they pass through
3. `useAppController` (`hooks/useAppController.ts:30`) calls `useTutorProfile(keypair.pubkey)` without passing `viewerRole` — no role awareness

## Scope

Changes across 20 files in 5 layers:

| Layer | Count | Key changes |
|-------|-------|-------------|
| `domain/` | 3 | `Role` type, `UserProfile`, `role?` field |
| `utils/` | 1 | `normalizeProfile` parses role from content |
| `ports/` | 1 | `UserProfileEvent` rename |
| `hooks/` | 5 | `useTutorProfile` accepts `viewerRole`, `useTutorDirectory` positive filter |
| `components/` | 7 | Type renames only |
| `nostr/` | 1 | Enum member rename |

---

## Step-by-step changes

### Step 1 — `domain/profile.ts`

```ts
export type Role = "tutor" | "student";
export const ROLES: Role[] = ["tutor", "student"];
export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export type UserProfile = {                    // renamed from TutorProfile
  name: string;
  bio: string;
  subjects: string[];
  languages: string[];
  hourlyRate: number;
  avatarUrl: string;
  availabilityMode?: AvailabilityMode;
  role?: Role;                                  // new field
};
// hasRoleTag — keep (backward-compat in filter)
```

### Step 2 — `domain/account.ts`

```ts
import { Role } from "./profile";
export type AccountRole = Role;                 // alias
export const ACCOUNT_ROLES: readonly Role[] = ["tutor", "student"] as const;
// LEGACY_ACCOUNT_ROLE, isAccountRole, errors — unchanged
```

### Step 3 — `domain/tutorSelectors.ts`

Replace `TutorProfile` → `UserProfile` in import + function signatures.

### Step 4 — `utils/normalize.ts`

**`emptyProfile`** — add `role: undefined`.

**`normalizeProfile`**:
```ts
export function normalizeProfile(input: ...): UserProfile {
  const rawRole = input?.role;
  return {
    // ... existing fields +
    role: typeof rawRole === "string" && isRole(rawRole) ? rawRole : undefined
  };
}
```

**`isProfileEmpty`** — update signature `UserProfile`, body unchanged.

### Step 5 — `ports/eventTypes.ts`

```ts
export type UserProfileEvent = {               // renamed from TutorProfileEvent
  pubkey: string;
  created_at: number;
  tags: string[][];
  profile: UserProfile;
};
```

### Step 6 — `hooks/useTutorProfile.ts`

- Add `viewerRole?: Role` param
- `buildProfileTags`: emit tag based on `nextProfile.role` instead of hardcoded `"tutor"`
- On EOSE auto-publish: inject `viewerRole` into profile before publishing
- Signatures use `UserProfile`

### Step 7 — `hooks/useTutorDirectory.ts`

Replace filter (line 73):
```ts
// old: (entry) => !hasRoleTag(entry.tags, "student")
// new (positive filter + backward compat):
(entry) => entry.profile.role === "tutor" || hasRoleTag(entry.tags, "tutor")
```

### Step 8 — `hooks/useAppController.ts`

Line 30: `const profileState = useTutorProfile(keypair.pubkey, viewerRole);`

### Step 9 — Remaining files (rename-only)

| File | Replace |
|------|---------|
| `hooks/hookTypes.ts` | `TutorProfile` → `UserProfile`, `TutorProfileEvent` → `UserProfileEvent` |
| `hooks/useAppNavigation.ts` | `TutorProfileEvent` → `UserProfileEvent` |
| `hooks/useRequestsTabViewModel.ts` | `TutorProfileEvent` → `UserProfileEvent` |
| `hooks/useBlossomConfig.ts` | `TutorProfile` → `UserProfile` |
| `components/ProfileForm.tsx` | Type rename |
| `components/DashboardSettingsDrawer.tsx` | Type rename |
| `components/TutorCard.tsx` | Type rename |
| `components/DiscoverTab.tsx` | Type rename |
| `components/LessonsTab.tsx` | Type rename |
| `components/DashboardTab.tsx` | Type rename |
| `components/LessonAgreementsPanel.tsx` | Type rename |
| `nostr/kinds.ts` | `TutorProfile = 30000` → `Profile = 30000` |

### Step 10 — Verify

- `npm run typecheck` — no type errors
- `npm run test` — all tests pass
- Manual: login as student → Discover shows 0 tutors (unless there are actual tutors)
- Manual: login as tutor → Discover shows tutors (self + others), not students
- Manual: login as student → profile form still works, publishes correctly
