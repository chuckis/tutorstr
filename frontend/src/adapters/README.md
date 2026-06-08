# Adapters — Port Implementations

Concrete implementations of the port interfaces. The only layer that touches localStorage, Web Crypto API, and nostr-tools.

## Directories

- `auth/` — Vault persistence, cipher, key material
  - `localStorageVaultRepository.ts`
  - `webCryptoVaultCipher.ts`
  - `nostrKeyMaterial.ts`
- `nostr/` — Nostr event mapping and relay I/O
  - See [`nostr/README.md`](./nostr/README.md) for full details
- `media/` — Media upload
  - `blossomBlobRepository.ts`
- `localStorageLocalePreferenceRepository.ts` — Locale in localStorage

## Rules

- Adapters are called only through their port interfaces
- **Only** `App.tsx` (composition root) and `hooks/RepoContext.tsx` import adapters directly
- Components and individual hooks never import adapters directly
