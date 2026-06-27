# Ports — Interface Contracts

Abstract TypeScript interfaces that the application layer uses to talk to the outside world. No implementations.

## Key interfaces

| File | Interface | Purpose |
|------|-----------|---------|
| `authVaultRepository.ts` | `AuthVaultRepository` | Load/save/clear encrypted vault |
| `vaultCipher.ts` | `VaultCipher` | Encrypt/decrypt with passphrase |
| `nostrKeyMaterial.ts` | `NostrKeyMaterial` | Key generation, derivation, encoding |
| `nostrSigner.ts` | `NostrSigner` | Nostr event signing interface |
| `signerManager.ts` | `SignerManager` | Set/get Nostr signer on the client |
| `bookingRepository.ts` | `BookingRepository` | High-level Booking CRUD |
| `bookingEventsRepository.ts` | `BookingEventsRepository` | Subscribe/publish Nostr booking events |
| `lessonRepository.ts` | `LessonRepository` | High-level Lesson CRUD |
| `lessonNoteRepository.ts` | `LessonNoteRepository` | Subscribe/publish lesson notes (encrypted) |
| `lessonAgreementEventsRepository.ts` | `LessonAgreementEventsRepository` | Subscribe/publish lesson agreement events |
| `privateMessagingRepository.ts` | `PrivateMessagingRepository` | Encrypted DMs and progress entries |
| `profileEventRepository.ts` | `ProfileEventRepository` | Subscribe/publish tutor profile (kind 30000) |
| `scheduleEventRepository.ts` | `ScheduleEventRepository` | Subscribe/publish tutor schedule (kind 30001) |
| `publicLessonRepository.ts` | `PublicLessonRepository` | Subscribe to all lesson agreements (kind 30006) |
| `mediaUploadRepository.ts` | `MediaUploadRepository` | Upload files to Blossom server |
| `relayManager.ts` | `RelayManager` | Update relay list on the client |
| `localePreferenceRepository.ts` | `LocalePreferenceRepository` | Load/save locale preference |
| `eventTypes.ts` | — | Shared types: `TutorProfileEvent`, `TutorScheduleEvent` |
| `blogRepository.ts` | `BlogRepository` | Blog post CRUD against Nostr (kind 30005) |
| `draftRepository.ts` | `DraftRepository` | Blog draft persistence (localStorage) |
| `muteListRepository.ts` | `MuteListRepository` | Subscribe/publish mute lists (NIP-51) |
| `notificationService.ts` | `NotificationService` | Toast/notification abstraction |
| `reportRepository.ts` | `ReportRepository` | Publish reports (NIP-56) |
| `reviewRepository.ts` | `ReviewRepository` | Subscribe/publish reviews (kind 32267) |
| `fileEncryptionRepository.ts` | `FileEncryptionRepository` | Client-side AES-256-GCM encrypt/decrypt for attachments |

## Rules

- Interfaces only, zero implementation
- Method names use domain language, not Nostr terminology
- Event types (`RawNostrEvent`) are defined inline to avoid depending on `nostr/`
