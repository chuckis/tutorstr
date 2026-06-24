# i18n — Internationalization

Translation provider and resource loader for multi-language support.

## Files

| File | Purpose |
|------|---------|
| `I18nProvider.tsx` | React context provider wrapping the app with translated strings |
| `resources.ts` | Translation resources loader (imports from `../locales/`) |

## Supported locales

- EN — English
- RU — Russian
- UK — Ukrainian

Each locale has 14 translation domains covering all UI areas (common, auth, discover, requests, lessons, blog, moderation, reviews, profile, settings, schedule, messages, hints, errors).

## Rules

- Translations are loaded via `I18nProvider` at the app root
- Components access translations via `useI18n()` hook
- No direct import of locale JSON files in components
