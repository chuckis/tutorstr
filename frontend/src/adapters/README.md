# Adapters — Port Implementations

Concrete implementations of the port interfaces. The only layer that touches localStorage, Web Crypto API, and nostr-tools.

## Directories

- `auth/` — Vault persistence, cipher, key material
  - `localStorageVaultRepository.ts`
  - `webCryptoVaultCipher.ts`
  - `nostrKeyMaterial.ts`
- `nostr/` — Nostr event mapping and relay I/O
  - See [`nostr/README.md`](./nostr/README.md) for full details
- `media/` — Media upload & preprocessing
  - `blossomBlobRepository.ts`
  - `createThumbnail.ts`
  - `stripExif.ts`
- `crypto/` — Client-side file encryption
  - `webCryptoFileEncryption.ts` — AES-256-GCM encrypt/decrypt for lesson note attachments
- `env/` — Platform detection
  - `platformDetector.ts`

## Standalone files

| File | Purpose |
|------|---------|
| `localStorageLocalePreferenceRepository.ts` | Locale preference in localStorage |
| `localStorageDraftRepository.ts` | Blog drafts in localStorage |
| `notificationService.ts` | Toast/notification manager |

## Rules

- Adapters are called only through their port interfaces
- **Only** `App.tsx` (composition root) and `hooks/RepoContext.tsx` import adapters directly
- Components and individual hooks never import adapters directly
