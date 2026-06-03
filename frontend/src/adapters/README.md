# Adapters — Port Implementations

Concrete implementations of the port interfaces. The only layer that touches localStorage, Web Crypto API, and nostr-tools.

## Directories

- `auth/` — Vault persistence, cipher, key material
  - `localStorageVaultRepository.ts`
  - `webCryptoVaultCipher.ts`
  - `nostrKeyMaterial.ts`
- `nostr/` — Nostr event mapping and relay I/O
  - `nostrSignerManager.ts` — wraps `nostrClient.setSigner` / `getSignerSession`
  - `profileEventRepository.ts` — subscribe/publish kind 30000
  - `scheduleEventRepository.ts` — subscribe/publish kind 30001
  - `publicLessonRepository.ts` — subscribe kind 30006
  - `relayManager.ts` — wraps `nostrClient.setRelays`
  - See [`nostr/README.md`](./nostr/README.md) for full details
- `localStorageLocalePreferenceRepository.ts` — Locale in localStorage

## Rules

- Adapters are called only through their port interfaces
- **Only** `App.tsx` (composition root) and `hooks/RepoContext.tsx` import adapters directly
- Components and individual hooks never import adapters directly
