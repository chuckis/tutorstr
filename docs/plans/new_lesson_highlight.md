# План: Подсветка карточки нового урока в LessonsTab

## Проблема

Когда согласованный урок появляется в списке LessonsTab, его карточка
не выделяется — пользователь не видит, что это новый урок.

## Причина

- `useNewArrivalIndicator` уже отслеживает новые уроки по `id`, но
  используется только для **бейджа таба** (строка 254 `useAppController.ts`)
- `LessonsTab` показывает `has-unread` + `inline-indicator` только на основе
  `getUnreadCount("lessons", threadKey)` — непрочитанных сообщений
- У нового урока нет сообщений в треде → `unreadCount === 0` → подсветки нет

## Как работает RequestsTab

В RequestsTab подсветка карточки тоже через `getUnreadCount("requests", threadKey)`.
Когда студент создаёт запрос, он может сразу отправить сообщение, поэтому
`unreadCount > 0` и подсветка есть. Для уроков такой корреляции нет —
урок создаётся системой без сообщения.

## Решение

### 1. `useNewArrivalIndicator.ts` — добавить метод `isNew(id)`

```typescript
const isNew = useCallback((id: string) => !seenIds.has(id), [seenIds]);
return { newCount, markAllSeen, isNew };
```

### 2. `useAppController.ts` — пробросить `isNewLesson`

```typescript
isNewLesson: (lessonId: string) => newLessonIndicator.isNew(lessonId),
```

### 3. `LessonsTab.tsx` — принять проп и применить к карточке

- Проп: `isNewLesson: (lessonId: string) => boolean`
- В `map` по урокам: `const showHighlight = unreadCount > 0 || isNewLesson(lesson.id)`
- `className` по `showHighlight` → `has-unread`
- `inline-indicator` по `showHighlight`:
  - если `unreadCount > 0` — количество (как сейчас)
  - иначе — `"New"`

### 4. `App.tsx` — передать проп

```tsx
isNewLesson={(lessonId) => ctrl.isNewLesson(lessonId)}
```

## Поведение

| Ситуация | До | После |
|---|---|---|
| Новый урок, сообщений нет | нет подсветки | `has-unread` + "New" |
| Новый урок, есть сообщения | `has-unread` + "New (N)" | то же самое |
| Старый урок, есть непрочитанные | `has-unread` + "New (N)" | то же самое |
| После визита таба `markAllSeen` | — | индикатор убран |

## Файлы

1. `frontend/src/hooks/useNewArrivalIndicator.ts`
2. `frontend/src/hooks/useAppController.ts`
3. `frontend/src/components/LessonsTab.tsx`
4. `frontend/src/App.tsx`

## Проверка

- После подтверждения бронирования карточка урока подсвечена у обоих
  участников (тьютор и студент)
- После перехода на таб Lessons подсветка снимается
- Непрочитанные сообщения продолжают корректно отображаться
- Бейдж таба (lessonsUnreadCount) не изменился
