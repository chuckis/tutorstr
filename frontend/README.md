# Tutorstr Frontend

React + TypeScript + Vite PWA for the Tutor Hub over Nostr platform.

## Layer structure

```
src/domain/      — Pure types, value objects, selectors
src/ports/       — Interface contracts (zero implementation)
src/adapters/    — Port implementations (localStorage, Web Crypto, Nostr)
src/application/ — Use cases, auth, role guards
src/hooks/       — React orchestration hooks
src/components/  — UI components and tab screens
src/nostr/       — Nostr transport (client, config, kinds)
```

Each layer has an agents-first README. Start there.

## Scripts

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Vitest
```

## Key conventions

- No hardcoded relay URLs in UI components
- UI components don't import from `nostr/`, `adapters/`, or `ports/` directly
- Every role-restricted action calls `assertRole()` from `application/account/`
- Components get a `role: AccountRole` prop for role-aware rendering
- Nostr event kinds: 30000–30006 + kind 4 for DMs
