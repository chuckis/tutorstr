# Улучшение LessonNote — список, детальный вид, метки

## Текущее состояние

- `LessonNoteEditor` — один textarea с тремя кнопками (Save / Publish / Share)
- Заметки контрагента показываются плоским списком inline в детальном виде урока (`sharedNotes`)
- Нет списка ВСЕХ заметок (своих + контрагента)
- Нет детального вида отдельной заметки
- Нет меток статуса

## Что нужно построить

```
Lesson Detail (как сейчас, но добавлена кнопка "View Notes")
  → Note List  (все заметки урока, каждая с chip-ами saved/published/shared)
    → Note Detail  (полный контент заметки + метки)
```

## Шаг 1: Домен — `NoteVisibility`

**`frontend/src/domain/lessonNote.ts`**
```typescript
export type NoteVisibility = "saved" | "published" | "shared";

export type LessonNoteWithVisibility = LessonNote & {
  visibility: NoteVisibility[];
};
```

## Шаг 2: Хук — расширить `useLessonNote`

**`frontend/src/hooks/useLessonNote.ts`**
- Добавить состояние `ownPublishIds: Set<string>` — ID заметок, опубликованных через `publishNote`
- Добавить состояние `ownShareIds: Set<string>` — ID заметок, опубликованных через `shareNoteWithCounterparty`
- Добавить `noteList: LessonNoteWithVisibility[]` — объединённый список:
  - **Локальный черновик** (из `localStorage`, если сохранён) → `["saved"]`
  - **Свои опубликованные** (из `nostrNotes` с `authorPubkey === viewerPubkey` и id в `ownPublishIds`) → `["published"]`, + `["saved"]` если контент совпадает с локальным
  - **Свои расшаренные** (id в `ownShareIds`) → `["shared"]`, + `["published"]` если также опубликовано
  - **Заметки контрагента** (из `sharedNotes`) → `["shared"]`
- Отсортировать по `createdAt` DESC (новые сверху)
- Вернуть `noteList` из хука (добавить в возвращаемый объект)

## Шаг 3: Компонент `LessonNoteList`

**Новый файл: `frontend/src/components/LessonNoteList.tsx`**

```typescript
type LessonNoteListProps = {
  notes: LessonNoteWithVisibility[];
  onSelectNote: (noteId: string) => void;
  onBack: () => void;
  tutors: Record<string, UserProfileEvent>;
  currentPubkey: string;
};
```
- Каждая заметка — карточка с:
  - Превью контента (обрезано до ~3 строк)
  - Автор (имя или "You")
  - Дата/время
  - `NoteVisibility` chip-ы: `saved` (серый), `published` (синий), `shared` (зелёный)
- Использовать существующий CSS-класс `.chips` со `span` для chip-ов
- Пустое состояние: "No notes yet"
- Back button через `DetailPageLayout`

## Шаг 4: Компонент `LessonNoteDetail`

**Новый файл: `frontend/src/components/LessonNoteDetail.tsx`**

```typescript
type LessonNoteDetailProps = {
  note: LessonNoteWithVisibility | null;
  onBack: () => void;
  tutors: Record<string, UserProfileEvent>;
  currentPubkey: string;
};
```
- Полный контент заметки
- Автор, тип (tutor/student), дата/время
- Chip-ы `visibility` (крупнее, чем в списке)
- `MessageAttachmentPreview` для вложений
- Back button через `DetailPageLayout`

## Шаг 5: Навигация внутри `LessonsTab`

**`frontend/src/components/LessonsTab.tsx`**
- Добавить локальный стейт:
  ```typescript
  type NoteView = null | "list" | "detail";
  const [noteView, setNoteView] = useState<NoteView>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  ```
- В детальном виде урока (после `LessonNoteEditor` / `sharedNotes`):
  - Добавить кнопку `t("lessons.viewNotes")` → открывает `noteView = "list"`
- Три режима рендера внутри `selectedLesson`:
  - `noteView === null` → текущий детальный вид (без изменений)
  - `noteView === "list"` → `<LessonNoteList>`
  - `noteView === "detail"` → `<LessonNoteDetail>`
- Навигация: list → select note → detail → back → list → back → lesson detail

## Шаг 6: Пробросить пропсы

**`frontend/src/App.tsx`**
- Добавить `noteList={lessonNoteState.noteList}` в `<LessonsTab>`

## Шаг 7: i18n — новые ключи

**`frontend/src/locales/{en,uk,ru}/lessons.json`**
```json
{
  "viewNotes": "View notes",
  "notesList": "Lesson notes",
  "notesEmpty": "No notes yet.",
  "backToNotes": "Back to notes",
  "visibility": {
    "saved": "Saved",
    "published": "Published",
    "shared": "Shared"
  },
  "noteDetail": "Note",
  "noteAuthorYou": "You"
}
```

## Шаг 8: CSS — стили

**`frontend/src/App.css`**
- `.note-list` — контейнер списка
- `.note-card` — карточка заметки (превью, автор, дата)
- `.note-card-content` — обрезанный текст
- `.note-detail` — полный контент
- `.visibility-chip` — базовый chip (12px border-radius, padding 4px 8px, font-size 0.75rem)
- `.visibility-chip--saved` — серый фон
- `.visibility-chip--published` — синий/primary фон
- `.visibility-chip--shared` — зелёный/success фон

## Шаг 9: Тесты

- `useLessonNote`: проверить, что `noteList` корректно объединяет локальные + опубликованные + расшаренные заметки
- `LessonNoteList`: базовый рендер
- `LessonNoteDetail`: рендер полного контента и chip-ов

## Затрагиваемые файлы

| # | Файл | Действие |
|---|------|----------|
| 1 | `frontend/src/domain/lessonNote.ts` | Добавить `NoteVisibility`, `LessonNoteWithVisibility` |
| 2 | `frontend/src/hooks/useLessonNote.ts` | Добавить `noteList`, `ownPublishIds`, `ownShareIds` |
| 3 | `frontend/src/components/LessonNoteList.tsx` | **Новый** — список заметок |
| 4 | `frontend/src/components/LessonNoteDetail.tsx` | **Новый** — детальный вид заметки |
| 5 | `frontend/src/components/LessonsTab.tsx` | Добавить noteView, рендер, кнопку |
| 6 | `frontend/src/App.tsx` | Пробросить `noteList` |
| 7 | `frontend/src/locales/{en,uk,ru}/lessons.json` | Добавить ключи |
| 8 | `frontend/src/App.css` | Стили |
| 9 | Тесты | Обновить |
