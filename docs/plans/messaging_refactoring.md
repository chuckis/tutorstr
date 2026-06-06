# Messaging Refactoring — итоговый отчёт

## Что было сделано

### P0 — Доменные модели + Порты + Kinds
- `domain/messaging.ts`: добавлены `MessageAttachment`, `MessageThreadInfo`, `MessageThreadType`; поле `attachments: MessageAttachment[]` в `EncryptedMessage`
- `domain/lessonNote.ts`: новый тип `LessonNote` с `lessonId`, `authorPubkey`, `noteType` (tutor/student), `attachments`
- `domain/messageThread.ts`: функции возвращают `MessageThreadInfo` вместо строки (обратно совместимо через `.threadKey`)
- `nostr/kinds.ts`: добавлен `DirectMessage = 4` в `TutorHubKind`
- `ports/privateMessagingRepository.ts`: добавлен `sendAttachmentMessage` + тип `AttachmentMessagePayload`
- `ports/mediaUploadRepository.ts`: добавлен `uploadMultiple`
- `ports/lessonNoteRepository.ts`: новый порт

### P1 — Адаптеры
- `adapters/nostr/privateMessagingRepository.ts`:
  - Парсинг `content` как JSON с `attachments` (обратно совместимо — plain text без JSON парсится как `{ text, attachments: [] }`)
  - `sendAttachmentMessage` публикует kind 4 с JSON `{ text?, attachmentUrls }`
  - Использует `TutorHubKind.DirectMessage` вместо `4`
- `adapters/nostr/blossomMediaRepository.ts`: добавлен `uploadMultiple` через `Promise.all`
- `adapters/nostr/lessonNoteRepository.ts`: новый — kind 30004 с `type: "lesson_note"`, шифрованный NIP-04

### P2 — Хуки
- `useMessageComposer.ts`: новый — управляет text + file selection + upload (Blossom) + send с/без attachment
- `useEncryptedMessages.ts`: оставлен без изменений (attachments приходят как поле `EncryptedMessage` через адаптер)
- `useLessonNote.ts`: переписан полностью — 3 отдельных действия:
  - `saveNoteLocally()` — localStorage (офлайн, без Nostr)
  - `publishNote()` — kind 30004, `["p", viewerPubkey]` (облачный бэкап)
  - `shareNoteWithCounterparty(counterpartyPubkey)` — kind 30004, `["p", counterparty]` (шаринг)
  - `sharedNotes[]` — заметки от counterparty, подгружаемые через подписку
- `useShare.ts`: упрощён — только `shareNoteWithCounterparty`, без Web Share API
- `usePrivateMessagingActions.ts`: добавлен `sendAttachmentMessage`
- `RepoContext.tsx`: добавлены `lessonNoteRepository`, `mediaUploadRepository`

### P3 — Компоненты
- `MessageThread.tsx`: пагинация ("Load N older messages"), sender/receiver bubbles, рендер `MessageAttachmentPreview`, scroll-to-bottom, `currentPubkey` prop для alignment
- `MessageComposer.tsx`: file picker, preview chips с превью для изображений, drag-and-drop, upload progress bar, disabled state при upload
- `MessageAttachmentPreview.tsx`: image grid (1-4), lightbox по клику, file icon для не-изображений
- `LessonNoteEditor.tsx`: 3 кнопки **Save** / **Publish** / **Share** с отображением статуса (idle → saving → published/shared/error)

### P4 — Use Cases
- `sendLessonNote.ts`: role-gated (`assertRole` по `noteType`), публикует через `LessonNoteRepository`
- `shareLessonNote.ts`: role-gated по `noteType` (tutor→tutor, student→student), публикует на `recipientPubkey`

### P5 — UI Integration
- `LessonsTab.tsx`: `LessonNoteEditor` вместо textarea (одинаково для обеих ролей), секция `shared-notes` с bubbles + автор + время
- `App.tsx`: проброшены новые пропсы `lessonNoteState`

### P6 — PWA Share Target
- `public/manifest.webmanifest`: добавлен `share_target` с action `/tutorstr/share`
- `ShareTargetHandler.tsx`: парсит `title/text/url` из GET-параметров, чистит URL

### P7 — localStorage Migration
- `useLessonNote.ts`: при загрузке читает localStorage → Nostr, при нахождении Nostr-заметки синхронизирует localStorage

---

## Отличия от предварительного плана

| Пункт плана | План | Факт |
|------------|------|------|
| **Share** | Web Share API (navigator.share) | Внутренний обмен заметками между student↔tutor через kind 30004 |
| **ShareButton** | Отдельный компонент в шапке урока | Удалён; share встроен в `LessonNoteEditor` как одна из 3 кнопок |
| **useLessonNote** | Один submit (Nostr + localStorage) | 3 действия: Save (localStorage), Publish (Nostr-self), Share (Nostr-counterparty) |
| **useShare** | Web Share + clipboard | Только `shareNoteWithCounterparty` для внутреннего шаринга |
| **Rich text editor** | Упоминался в плане | Не реализован — остаётся textarea |
| **kind 30005 (TutorBlogPost)** | Упоминался | Не реализован (был в backlog) |
| **NIP-44** | Упоминался как deferred | Deferred |

---

## Затрагиваемые файлы

```
frontend/src/
├── domain/
│   ├── messaging.ts          ↑ MessageAttachment, MessageThreadInfo
│   ├── lessonNote.ts          NEW
│   └── messageThread.ts      ↑ MessageThreadInfo return type
├── nostr/
│   └── kinds.ts              ↑ DirectMessage = 4
├── ports/
│   ├── privateMessagingRepository.ts  ↑ sendAttachmentMessage
│   ├── mediaUploadRepository.ts       ↑ uploadMultiple
│   └── lessonNoteRepository.ts         NEW
├── adapters/nostr/
│   ├── privateMessagingRepository.ts  ↑ JSON parsing, TutorHubKind.DirectMessage
│   ├── blossomMediaRepository.ts       ↑ uploadMultiple
│   └── lessonNoteRepository.ts         NEW
├── hooks/
│   ├── useMessageComposer.ts           NEW
│   ├── useShare.ts                     REWRITTEN (internal sharing)
│   ├── useLessonNote.ts                REWRITTEN (3 actions)
│   ├── usePrivateMessagingActions.ts   ↑ sendAttachmentMessage
│   └── RepoContext.tsx                  ↑ lessonNoteRepository, mediaUploadRepository
├── application/usecases/
│   ├── sendLessonNote.ts               NEW
│   └── shareLessonNote.ts              NEW → REWRITTEN (both roles)
├── components/
│   ├── MessageThread.tsx               ↑ pagination, bubbles, attachments
│   ├── MessageComposer.tsx             ↑ file picker, drag-drop, upload progress
│   ├── MessageAttachmentPreview.tsx     NEW
│   ├── LessonNoteEditor.tsx            NEW → REWRITTEN (3 buttons)
│   ├── LessonNoteEditor.tsx            ↑ shared notes section
│   ├── ShareTargetHandler.tsx           NEW
│   └── ShareButton.tsx                  DELETED from imports
├── public/
│   └── manifest.webmanifest            ↑ share_target
└── locales/{en,uk,ru}/
    ├── common.json                     ↑ actions.share, states.uploading/saving/error
    └── lessons.json                    ↑ saveLocally, publish, published, share, shared, sharedNotes
```
