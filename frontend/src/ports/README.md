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
| `signerManager.ts` | `SignerManager` | Set/get Nostr signer on the client |
| `profileEventRepository.ts` | `ProfileEventRepository` | Subscribe/publish tutor profile (kind 30000) |
| `scheduleEventRepository.ts` | `ScheduleEventRepository` | Subscribe/publish tutor schedule (kind 30001) |
| `publicLessonRepository.ts` | `PublicLessonRepository` | Subscribe to all lesson agreements (kind 30006) |
| `relayManager.ts` | `RelayManager` | Update relay list on the client |
| `eventTypes.ts` | — | Shared types: `TutorProfileEvent`, `TutorScheduleEvent` |

## Rules

- Interfaces only, zero implementation
- Method names use domain language, not Nostr terminology
- Event types (`RawNostrEvent`) are defined inline to avoid depending on `nostr/`
