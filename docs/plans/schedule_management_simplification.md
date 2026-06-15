# Schedule Management — упрощение UX и исправление багов

## Проблема

Пользователь сообщает: «После выбора даты и времени пользователь нажимает
кнопку Добавить слот и слот уходит в события».

Фактически слот добавляется в `draftSchedule` (локальный стейт) — это
корректно. Но есть баги, из-за которых UX сбивает с толку:

1. **`isDirty` не срабатывает при добавлении слота** — `addSlot()` не
   вызывает `setIsDirty(true)`, только `removeSlot()`. Индикатор
   несохранённых изменений не появляется при добавлении.
2. **Нестабильные ключи списка** — `key={`${slot.start}-${originalIndex}`}`
   даёт дубликаты при одинаковом `start` (React warning + баги
   повторного рендера).
3. **Нет обратной связи после публикации** — `scheduleStatus` не
   передаётся в `ScheduleForm`.

## Решение

### 1. `ScheduleForm.tsx` — починить isDirty и ключи

- **`addSlot()`**: добавить `setIsDirty(true)` после добавления слота
- **Ключ списка**: заменить `${slot.start}-${originalIndex}` на
  `originalIndex`

### 2. `useTutorSchedule.ts` — без изменений логики

`mergeSchedules` остаётся — при публикации старые опубликованные слоты
сохраняются, новые добавляются. Публикация НЕ заменяет всё расписание,
а дополняет его.

### 3. ScheduleForm — передать scheduleStatus (опционально)

Можно передать `scheduleStatus` как проп, чтобы показывать фидбек
"Публикация успешна" / "Ошибка" внутри формы.

### Файлы для изменений

| Файл | Изменения |
|------|-----------|
| `frontend/src/components/ScheduleForm.tsx` | isDirty в addSlot, ключи списка |
| `frontend/src/hooks/useTutorSchedule.ts` | Не меняется (mergeSchedules сохранён) |

### Что остаётся без изменений

- **Event Bus** — чтение через `scheduleEventRepository.subscribe`
  → `addKindListener` (kind `30001`). Источник истины — Nostr.
- **`PublishTutorSchedule` use-case** — без изменений
- **DashboardTab / App.tsx** — пропсы не меняются

### Проверка

```bash
cd frontend && npx vitest run
```
