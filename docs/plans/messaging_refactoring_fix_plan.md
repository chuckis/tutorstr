# План исправлений: заметки урока и вложения с соблюдением ЧА

## Summary
- Исправить недоведённую интеграцию из `docs/plans/messaging_refactoring.md`: входящие заметки, видимость списка, статусы получения и загрузку вложений.
- Держать Clean Architecture: UI не ходит к Nostr/Blossom напрямую, side effects идут через use-cases, ports и adapters.

## Key Changes
- `LessonNoteRepository`: подписка должна читать входящие shared notes по `#p: [viewerPubkey]` и собственные backup notes по `authors: [viewerPubkey]`.
- `useLessonNote`: принимать `viewerRole`, вычислять `noteType` из роли и вызывать `SendLessonNote` / `ShareLessonNote` вместо прямого `repository.publishNote`.
- `LessonsTab`: всегда показывать shared notes section с состояниями `loading`, `empty`, `received`, `error`, плюс автор/время/количество вложений для последней входящей заметки.
- `MessageComposer`: подключить реальный attachment path через controller action и repository, показывать `selected/uploading/sent/failed`, не очищать файлы при ошибке.
- `MessageAttachmentPreview`: использовать единообразно для DM-вложений и shared-note вложений.

## Architecture Rules
- UI-компоненты получают props и callbacks, не импортируют repositories, adapters, `nostrClient`, `localStorage` или Blossom SDK.
- Hooks только оркестрируют состояние и вызывают application use-cases / ports.
- Role-restricted actions обязательно проходят через `assertRole` внутри use-case.
- Новые Nostr kinds не добавлять; роль не публиковать в Nostr.

## Test Plan
- Unit: `LessonNoteRepository` отдаёт incoming notes по `#p`, own backup по `authors`, игнорирует malformed payload.
- Unit: `SendLessonNote` / `ShareLessonNote` проходят с верной ролью и reject с `RoleMismatchError` для противоположной.
- Hook/component: `useLessonNote` показывает empty state, принимает входящую заметку и не перезаписывает личную заметку чужой.
- Component: `MessageComposer` показывает progress, вызывает attachment-send path, сохраняет выбранные файлы после upload error.
- Run: `cd frontend && npm test`.

## Assumptions
- Blossom server используется из существующей настройки, отдельный новый экран настройки не добавляется.
- Shared notes остаются механизмом урока, а не обычным DM.
