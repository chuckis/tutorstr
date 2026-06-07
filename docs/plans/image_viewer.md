# Image Viewer для чата

## Текущее состояние
- `MessageAttachmentPreview.tsx` — примитивная lightbox: `<div>` на весь экран с `<img>` и `×`.
- Нет CSS-стилей для классов lightbox/thumb/grid (есть в компоненте, нет в `App.css`).
- Нет свайпа, зума, клавиатурной навигации, лимита thumbnails.
- `MessageAttachment { url, mimeType, fileName?, size? }` — нет `thumbnailUrl`.

## Шаг 1 — CSS для сетки и lightbox
**Файл:** `App.css`

Добавить стили:
- `.attachment-thumb` — max 260×260px, `object-fit: cover`, cursor pointer
- `.attachment-grid-1` / `-2` / `-3` / `-4` — grid-раскладка
- `.attachment-lightbox` — fixed fullscreen, dark overlay, flex center
- `.lightbox-image` — max 90vw/90vh, `object-fit: contain`
- `.lightbox-close` — absolute top-right

## Шаг 2 — ImageViewer (замена inline lightbox)
**Новый файл:** `src/components/ImageViewer.tsx`

```tsx
type ImageViewerProps = {
  images: { url: string; thumbnailUrl?: string; fileName?: string }[];
  defaultIndex: number;
  onClose: () => void;
};
```

Фичи:
- Escape → close
- ArrowLeft/Right → prev/next
- Touch-свайп (50px порог) → prev/next
- Счётчик «2 / 5»
- Desktop hover zoom: `transform: scale(2); transform-origin` по координатам мыши
- Клик по backdrop → close

## Шаг 3 — Интеграция ImageViewer в MessageAttachmentPreview
**Файл:** `MessageAttachmentPreview.tsx`

- Поднять `useState<number | null>` для viewer index
- Убрать старый `AttachmentImage` с локальным `useState`
- Все `images[]` кликабельные → открывают `ImageViewer` с `defaultIndex`

## Шаг 4 — thumbnailUrl в модели (опционально)
**Файлы:**
- `domain/messaging.ts` — добавить `thumbnailUrl?: string` в `MessageAttachment`
- `ports/mediaUploadRepository.ts` — `upload()` → `Promise<{ url; thumbnailUrl? }>`
- `adapters/media/createThumbnail.ts` — canvas-ресайз (256px по большей стороне)
- `adapters/nostr/blossomMediaRepository.ts` — после upload оригинала: thumbnail → upload → вернуть `{ url, thumbnailUrl }`

## Шаг 5 — Адаптация остальных мест
- `useMessageComposer.ts`, `useLessonNote.ts` — под новый возврат `upload()`

## Порядок реализации
1. CSS
2. ImageViewer (новый файл, независим)
3. Интеграция в MessageAttachmentPreview
4. (Опционально) thumbnailUrl в модели и генерация

Шаги 1-3 не требуют изменения модели данных и работают без thumbnailUrl.
