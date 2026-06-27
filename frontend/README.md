# TutorHub Frontend

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


## E2E-Encrypted Attachments

File attachments in Lesson Notes are encrypted end-to-end before leaving the client:

1. **Encryption**: File is encrypted with AES-256-GCM (random key) via Web Crypto API
2. **Storage**: Encrypted blob is uploaded to a Blossom server (with `image/png` MIME for compatibility). Falls back to session-local `blob:` URL if the server rejects the upload.
3. **Key distribution**: The AES key (base64) is stored in `MessageAttachment.encryptionKey` inside the NIP-44 encrypted note payload — only the note author and recipient can decrypt it.
4. **Viewing**: Recipient decrypts the note, fetches the encrypted blob, decrypts it with the stored key, and displays the original content.

> **MVP limitation**: If Blossom upload fails, attachments fall back to ephemeral `blob:` URLs valid only for the current session. After page refresh, such attachments show "Unavailable — re-upload after refresh." A Blossom-compatible storage server that accepts arbitrary MIME types is needed for production persistence.
