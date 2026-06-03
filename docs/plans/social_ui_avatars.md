# Social UI + Profile Avatars

## Goal
Improve TutorHub UI: profile pictures in cards, Nostr media upload (Blossom), role-based default avatars, clean minimal styling.

## Key decisions
- **Blossom (NIP-96)** via `blossom-client-sdk` (npm, v4.1.0)
- No separate `StudentCard` — Avatar component reused in existing views
- Default images in `public/images/avatars/` (256×256 PNG)
- Tutor → scientists, Student → anime characters (user provides images)

---

## Files changed

### New files (5)
| File | Purpose |
|------|---------|
| `frontend/src/components/Avatar.tsx` | Universal avatar: `url`, `role`, `size` (sm/md/lg), `editable`, `onChange` |
| `frontend/src/ports/mediaUploadRepository.ts` | `upload(file, signer, serverUrl): Promise<string>` |
| `frontend/src/adapters/nostr/blossomMediaRepository.ts` | Blossom upload via `BlossomClient.uploadBlob()` |
| `frontend/public/images/avatars/default-tutor.png` | Default tutor image (scientists) |
| `frontend/public/images/avatars/default-student.png` | Default student image (anime) |

### Modified files (12)
| File | Change |
|------|--------|
| `frontend/package.json` | Add `blossom-client-sdk` |
| `frontend/src/components/TutorCard.tsx` | Add Avatar, flex-row layout |
| `frontend/src/components/TutorProfileView.tsx` | Add Avatar (lg) at top |
| `frontend/src/components/ProfileForm.tsx` | Replace avatarUrl text input with Avatar upload widget |
| `frontend/src/components/DashboardSettingsDrawer.tsx` | Use Avatar component, add Blossom server URL field |
| `frontend/src/components/DashboardTab.tsx` | Add Avatar (md) in profile section |
| `frontend/src/components/DiscoverTab.tsx` | Avatar in tutor detail panel |
| `frontend/src/App.tsx` | Use `<Avatar>` for topbar badge |
| `frontend/src/App.css` | Redesigned cards, Avatar styles, radius/shadow tokens |
| `frontend/src/locales/en.json` | New i18n keys |
| `frontend/src/locales/ru.json` | New i18n keys |
| `frontend/src/locales/uk.json` | New i18n keys |

---

## Implementation Phases

### Phase 1 — Avatar component + defaults
- Create `Avatar.tsx`
  - Props: `url?: string`, `role: AccountRole`, `size: AvatarSize`, `editable?: boolean`, `onChange?: (file: File) => void`
  - Fallback logic: `role === "tutor" → /images/avatars/default-tutor.png` else `/images/avatars/default-student.png`
  - Sizes: sm=36px, md=56px, lg=96px
  - Editable: hover overlay with camera icon, triggers hidden `<input type="file">`
- Add CSS in `App.css`
- Replace `profile-badge-avatar` / `profile-badge-fallback` in `App.tsx` with `<Avatar>`
- Update `DashboardSettingsDrawer.tsx` identity card

### Phase 2 — Blossom upload
- `npm install blossom-client-sdk`
- Create `ports/mediaUploadRepository.ts`
- Create `adapters/nostr/blossomMediaRepository.ts`
  - Uses `BlossomClient.uploadBlob(server, file, authEvent)`
  - Auth event signed via `NostrSigner.signEvent()` (compatible with `blossom-client-sdk` signer shape)
  - Config: `localStorage` key `tutorhub:blossomServer`
- Add Blossom server URL input in `DashboardSettingsDrawer.tsx`

### Phase 3 — ProfileForm upload UI
- Replace `<input>` for `avatarUrl` with `<Avatar editable onChange={…}>`
- File selected → upload to Blossom → URL into profile state
- Loading indicator during upload
- Fallback to text input if no Blossom server configured

### Phase 4 — Cards redesign
- `TutorCard.tsx`: Avatar (md) + name row, bio, subject chips
  - Layout: `<div class="tutor-card"><div class="tutor-card-header"><Avatar/> <div>name + npub</div></div> bio … chips</div>`
- `TutorProfileView.tsx`: centered Avatar (lg) at top
- `DashboardTab.tsx`: Avatar (md) in profile summary
- `DiscoverTab.tsx`: show Avatar in tutor detail panel

### Phase 5 — CSS cleanup (minimal clean)
- `--radius: 12px` (was 7px)
- Card backgrounds: white (`#fff`) instead of `--color-surface`
- `box-shadow: 0 2px 12px rgba(0,0,0,0.06)` on cards
- `transition: transform 180ms ease, box-shadow 180ms ease`
- Hover: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.1)`
- Clean up unused surface color vars

---

## i18n keys

```
profile.form.uploadAvatar       "Upload avatar"
profile.form.changeAvatar       "Change avatar"
profile.form.blossomServerUrl   "Blossom server URL"
profile.avatar.defaultTutorAlt  "Default tutor avatar"
profile.avatar.defaultStudentAlt "Default student avatar"
```

---

## Testing

- `Avatar.test.tsx`: renders with/without URL, per-role defaults, editable click
- `blossomMediaRepository.test.ts`: mock `fetch`, verify auth header and success path
