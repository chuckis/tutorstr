# План: Внедрение @mdxeditor/editor в BlogPostEditor и LessonNoteEditor

**Дата:** 2026-06-13
**Статус:** Утверждён

## Текущее состояние

- `@mdxeditor/editor` версии `^4.0.3` установлен в `frontend/package.json`, но **нигде не используется**
- `BlogPostEditor` — `<textarea>` для body (хранит markdown), загрузка изображений отсутствует
- `LessonNoteEditor` — `<textarea>` + кастомная загрузка файлов (image, pdf, doc, txt)
- Blossom upload пайплайн реализован: `blossomMediaRepository.ts` (EXIF strip, thumbnail, upload через `blossom-client-sdk`)

## Решения (согласовано)

| Вопрос | Решение |
|--------|---------|
| diffSource (raw markdown) | Только в BlogPostEditor |
| Image upload в LessonNoteEditor | Нет (только plain WYSIWYG, файловые вложения как есть) |
| LessonNoteDetail рендеринг | Plain text (не менять) |
| Архитектура image upload | Через новый хук `useEditorImageUpload` |
| Toolbar | Компактный, мобильно-дружественный |

## План работ

### 1. Создать `useEditorImageUpload` хук

**Файл:** `frontend/src/hooks/useEditorImageUpload.ts`

- Использует `useRepo()` для доступа к `mediaUploadRepository` и `signerManager`
- Принимает опциональный `blossomUrl` аргумент, с fallback к чтению `localStorage` по ключу `tutorhub:blossomServer`
- Возвращает `uploadImage: (file: File) => Promise<string>`
- Тип возврата совместим с `ImageUploadHandler` из `@mdxeditor/editor`

### 2. Модифицировать BlogPostEditor

**Файл:** `frontend/src/components/blog/BlogPostEditor.tsx`

- Заменить `<textarea>` на `<MDXEditor>`:
  - Импорт: `MDXEditor`, `MDXEditorMethods`, плагины, `@mdxeditor/editor/dist/style.css`
  - `useRef<MDXEditorMethods>()` для доступа к содержимому
  - `useEffect` с `ref.current?.setMarkdown(initialDraft.body)` для инициализации
  - `getDraft()` читает body через `ref.current?.getMarkdown() ?? ""`
- **Плагины:** `toolbarPlugin`, `headingsPlugin`, `listsPlugin`, `linkPlugin`, `linkDialogPlugin`, `imagePlugin`, `quotePlugin`, `codeBlockPlugin`, `markdownShortcutPlugin`, `diffSourcePlugin`
- **Toolbar contents:**
  ```
  UndoRedo | BoldItalicUnderlineToggles CodeToggle | BlockTypeSelect CreateLink InsertImage ListsToggle | diffSource
  ```
- **Image upload:** `imagePlugin({ imageUploadHandler: uploadImage })` — колбэк из `useEditorImageUpload`
- Пропсы `role`, `onSave`, `onPublish`, `onDiscard`, `saving`, `publishing` — без изменений

### 3. Модифицировать LessonNoteEditor

**Файл:** `frontend/src/components/LessonNoteEditor.tsx`

- Заменить `<textarea>` на `<MDXEditor>`:
  - Те же шаги инициализации и ref
  - `onChange` MDXEditor вызывает проп `onChange(value)` синхронно
- **Плагины:** те же, кроме `imagePlugin` и `diffSourcePlugin`
- **Image upload:** НЕ добавляем
- **Файловые вложения** (pdf, docx, txt) — полностью сохранить существующий UI (filePreviews, upload progress, attach button)
- **Toolbar contents:**
  ```
  UndoRedo | BoldItalicUnderlineToggles CodeToggle | BlockTypeSelect CreateLink ListsToggle
  ```

### 4. Стилизация

- **Глобальный импорт** `@mdxeditor/editor/dist/style.css` в `App.tsx` (один раз)
- **Кастомизация:** через `contentEditableClassName` и `toolbarClassName`
- **Мобильная адаптация:** компактные кнопки тулбара (переопределить при необходимости в `App.css`)
- Убедиться, что существующие CSS-переменные и токены применяются к редактору

### 5. Файлы для изменения

| Файл | Действие |
|------|----------|
| `frontend/src/hooks/useEditorImageUpload.ts` | **CREATE** — новый хук |
| `frontend/src/components/blog/BlogPostEditor.tsx` | **EDIT** — MDXEditor + image plugin |
| `frontend/src/components/LessonNoteEditor.tsx` | **EDIT** — MDXEditor (без image) |
| `frontend/src/App.tsx` | **EDIT** — импорт CSS редактора |
| `frontend/src/index.css` или `frontend/src/App.css` | **EDIT** — кастомизация тулбара (если нужно) |

### 6. Что НЕ меняется

- `useMyBlog.ts` — логика остаётся прежней
- `useLessonNote.ts` — логика остаётся прежней
- `LessonNoteDetail.tsx` — рендеринг plain text
- `domain/`, `adapters/`, `ports/` — Blossom пайплайн уже существует
- `BlogEditorView.tsx` — если `useEditorImageUpload` самодостаточен (читает `blossomUrl` из `localStorage`)
- Toolbar не содержит компонентов, требующих загрузки изображений в LessonNoteEditor

## Последовательность выполнения

1. Создать `useEditorImageUpload.ts`
2. Импортировать CSS редактора в `App.tsx`
3. Переписать `BlogPostEditor.tsx`
4. Переписать `LessonNoteEditor.tsx`
5. Проверить билд (`npm run build` или `npm run typecheck`)
6. Визуально проверить оба редактора в UI

## Линтер/Тайпчек

После реализации выполнить:
```
npm run lint
npm run typecheck
```

(команды из корня репозитория или `frontend/` — уточнить по README)
