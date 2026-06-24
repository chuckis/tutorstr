# Theme — Light/Dark Mode

Theme provider and types for light/dark mode support.

## Files

| File | Purpose |
|------|---------|
| `ThemeProvider.tsx` | React context provider wrapping the app with CSS class toggling and localStorage persistence |

## Rules

- Theme value (`"light"` / `"dark"`) is managed via CSS class on `<html>` element
- Persisted in localStorage under `tutorhub:theme`
- Type: `Theme` from `../domain/theme.ts`
