# Review System — Optimistic Update Fix Plan

**Status:** Implemented (see commits on `fe8c64b`..HEAD)  
**Related:** `docs/plans/reputation_system.md` (original design)

---

## Problem

Система отзывов (kind 32267) перестала корректно отображать оптимистичные
обновления после отправки отзыва. Пользователь отправлял отзыв — тот писался
в `reviewStore` (Zustand), но UI не считывал этот стор, поэтому отзыв
появлялся только после подтверждения от релея.

### Root cause

Коммит `fe8c64b` добавил:

- `stores/reviewStore.ts` — Zustand-стор для оптимистичных отзывов
- `hooks/useAppActions.ts` — коллбэки `onOptimisticUpdate` / `onRollback`,
  которые пишут/удаляют отзывы в `reviewStore`

НО:

- `hooks/useReviewsForSubject.ts` (единственный hook для чтения отзывов)
  **не читает** `reviewStore` — использует локальный `useState<Review[]>`,
  обновляемый только через колбэк подписки `subscribeReviewsForSubject`

В результате: отзыв не виден в UI, пока релей не пришлёт подтверждение
через глобальную подписку и `emitEvent` -> `kindListeners`.

---

## Fix 1: `useReviewsForSubject.ts` — merge store reviews

**Файл:** `frontend/src/hooks/useReviewsForSubject.ts`

**Что сделано:**

1. Добавлен импорт `useReviewStore` из `stores/reviewStore.ts`
2. Локальный `useState<Review[]>` (`reviews`) переименован в
   `subscriptionReviews` — хранит только отзывы от подписки
3. Добавлен `const storeReviews` через `useReviewStore((s) => s.bySubject[subjectPubkey] ?? [])`
4. Добавлен `useMemo`, который мержит `storeReviews` и `subscriptionReviews`,
   дедуплицируя по `review.id` — приоритет — у store-версии (оптимистичной)
5. Остальные зависимости (`completedLessonsCount`, `reputation`) без изменений

**Результат:** Оптимистичный отзыв сразу появляется в UI после отправки,
а подписка с релея добавляет подтверждённую копию (дедуплицируется по id).

---

## Fix 2: `reviewRepository.ts` — проверять EventBus кеш

**Файл:** `frontend/src/adapters/nostr/reviewRepository.ts`

**Что сделано:**

1. Добавлен импорт `useEventBusStore` из `./eventBus`
2. В `getReviewByAuthorAndLesson` перед подпиской на релей проверяется
   `useEventBusStore.getState().eventsByKind[TutorHubKind.Review]`
3. Если в кеше найден отзыв с совпадающими `authorPubkey` и `lessonId` (через
   `getTagValue(event.tags, "d")`), он сразу возвращается без запроса к релею
4. Если не найден — падаем на существующую подписку (без изменений)

**Результат:** Дюп-ревиз предотвращается даже при медленном релее, т.к.
кеш `eventBusStore` уже может содержать нужный отзыв.

---

## Testing

### Unit tests (already exist, unchanged)

- `publishReview.test.ts` — 4 теста: ok, not_completed, self_review, already_exists
- `computeReputation.test.ts` — 4 теста

### Adapter tests (weak, marked for improvement)

- `reviewRepository.test.ts` — только проверяет, что `createNostrReviewRepository()`
  возвращает объект и `TutorHubKind.Review === 32267`
- Не тестирует `parseReviewEvent`, `buildReviewTags`, `getReviewByAuthorAndLesson`

### Что добавить в будущем

- Тест на `getReviewByAuthorAndLesson` с мокнутым `useEventBusStore`
- Интеграционный тест на `useReviewsForSubject` с заполненным `reviewStore`

---

## Documentation updates

| File | Change |
|------|--------|
| `docs/nostr-kinds.md` | Добавлен kind 32267 — Review |
| `docs/spec.md` §3 | "Reputation and rating system" убран из Out of Scope |
| `docs/spec.md` §6 | Табличка kinds дополнена строкой `32267 \| Review` |
| `frontend/src/nostr/README.md` | `TutorHubKind enum` обновлён (30000–32267) |

---

# Lesson Completion — Race Condition Fix

**Status:** Implemented

---

## Problem

Принятый урок (kind 30006, статус `scheduled`) не доходил до Студента со
статусом `completed`, когда Тьютор нажимал "Завершить" сразу после Accept.

### Root cause

`AcceptBooking.execute()` публикует kind 30006, но не добавляет урок в
`lessonStore` оптимистично — `onOptimisticUpdate` не был передан в
`useBookings.ts` (строки 109–113 ДО фикса).

Цепочка отказа:

```
Tutor clicks "Accept"
  → AcceptBooking.execute()
    → bookingRepo.updateStatus("accepted")  // kind 30003
    → lessonRepo.save(lesson)               // kind 30006 (scheduled)
    → (relay echo ещё не пришёл)
Tutor immediately clicks "Mark Completed"
  → ChangeLessonStatus.execute()
    → optimisticStatusUpdate → UI показывает "completed"
    → lessonRepository.updateStatus(id, "completed")
      → agreements[id] = undefined  // эхо от save ещё не дошло
      → return  // СИЛЕНТНЫЙ FAIL — ничего не опубликовано!
Tutor видит "completed" (оптимистично)
Student НИКОГДА не получает kind 30006 со статусом "completed"
```

### Файлы изменений

| Файл | Изменение |
|------|-----------|
| `application/usecases/acceptBooking.ts` | Сигнатура `onOptimisticUpdate` расширена: передаёт `Lesson` вместо `lessonId` |
| `hooks/useBookings.ts` | Передан коллбэк в `AcceptBooking` → вызывает `useLessonStore.getState().optimisticAddLesson()` |
| `adapters/nostr/lessonRepository.ts` | `LessonAgreementNotFoundError` вместо silent `return` — ошибка не маскируется |
