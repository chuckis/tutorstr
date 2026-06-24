# Utils — Pure Helpers

Pure utility functions. No React, no Nostr, no side effects (except `hintStorage`).

## Files

| File | Purpose |
|------|---------|
| `calendar.ts` | Date arithmetic, week boundaries, day labels |
| `dateTimeLocal.ts` | `<input type="datetime-local">` value formatting |
| `display.ts` | `toDisplayId` — shorten pubkey for UI |
| `hintStorage.ts` | Hint state persistence in localStorage (views, dismissals) |
| `normalize.ts` | Profile/schema normalization helpers |
| `nostrTags.ts` | Nostr tag parsing utilities |
| `notificationCursor.ts` | Notification cursor (timestamp tracking) |

## Rules

- No React imports
- No Nostr imports
- No side effects (except `hintStorage.ts` which wraps localStorage)
