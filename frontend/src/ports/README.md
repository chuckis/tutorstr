# Ports — Interface Contracts

Abstract TypeScript interfaces that the application layer uses to talk to the outside world. No implementations.

## Key interfaces

| File | Interface | Purpose |
|------|-----------|---------|
| `authVaultRepository.ts` | `AuthVaultRepository` | Load/save/clear encrypted vault |
| `vaultCipher.ts` | `VaultCipher` | Encrypt/decrypt with passphrase |
| `nostrKeyMaterial.ts` | `NostrKeyMaterial` | Key generation, derivation, encoding |
| `bookingRepository.ts` | `BookingRepository` | High-level Booking CRUD |
| `bookingEventsRepository.ts` | `BookingEventsRepository` | Subscribe/publish Nostr booking events |
| `lessonRepository.ts` | `LessonRepository` | High-level Lesson CRUD |
| `lessonAgreementEventsRepository.ts` | `LessonAgreementEventsRepository` | Subscribe/publish lesson agreement events |
| `privateMessagingRepository.ts` | `PrivateMessagingRepository` | Encrypted DMs and progress entries |
| `localePreferenceRepository.ts` | `LocalePreferenceRepository` | Load/save locale preference |

## Rules

- Interfaces only, zero implementation
- Method names use domain language, not Nostr terminology
