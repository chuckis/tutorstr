# Optimistic UI + Rollback Plan

## Проблема

Из 14 write-сценариев optimistic update есть только в `changeLessonStatus`.
Rollback'а нет нигде — при ошибке реле стора навсегда остаётся в неверном состоянии.

---

## Механизм rollback (общий паттерн)

Каждый Use Case, выполняющий запись, принимает два опциональных колбэка:

```
onOptimisticUpdate?: (data, snapshot) => void
onRollback?: (snapshot) => void
```

**Жизненный цикл:**

1. `captureSnapshot()` — читает текущее состояние из Zustand store ДО мутации
2. `onOptimisticUpdate(data, snapshot)` — пишет в стора. Снапшот передан,
   чтобы колбэк мог знать исходное состояние
3. `await repo.publish(...)` — сетевой вызов
4. Если `publish` упал → `onRollback(snapshot)` восстанавливает стора,
   ошибка пробрасывается наверх

---

## Расширение стора

| Store | snapshot метод | restore метод |
|---|---|---|
| `bookingStore` | `snapshotStatus(bookingId)` | `restoreStatus(bookingId, snapshot)` |
| `bookingStore` | `snapshotRequest(bookingId)` | `restoreRequest(bookingId, snapshot)` |
| `scheduleStore` | `snapshotSchedule(pubkey)` | `restoreSchedule(pubkey, snapshot)` |
| `profileStore` | `snapshotProfile(pubkey)` | `restoreProfile(pubkey, snapshot)` |
| `lessonStore` | `snapshotLesson(lessonId)` | `restoreLesson(lessonId, snapshot)` |
| `messageStore` | `snapshotThread(threadKey)` | `restoreThread(threadKey, snapshot)` |

---

## Batch 1 (high priority)

| Use Case | Стора | Что делаем |
|---|---|---|
| `changeLessonStatus` | lessonStore | Добавить rollback |
| `acceptBooking` | bookingStore + lessonStore | optimistic + rollback |
| `cancelBooking` | bookingStore | optimistic + rollback |
| `createBookingRequest` | bookingStore | optimistic + rollback |
| `publishTutorSchedule` | scheduleStore | optimistic + rollback |
| `publishMuteList` | (локально useModeration) | rollback |
| `sendEncryptedMessage` | messageStore | optimistic + rollback |
| `respondToBooking(reject)` | bookingStore | optimistic + rollback |
| `publishProfile` | profileStore | optimistic + rollback |

### Детали по каждому

#### 1. `changeLessonStatus` (rollback only)
Снапшот: `useLessonStore.getState().byId[lesson.id]` до optimistic update.
Rollback: `onRollback(lessonId, snapshot)` → `set(byId[lessonId] = snapshot)`.

#### 2. `acceptBooking` (multi-step)
Пишет: booking status accepted + lesson save + reject competitors.
Снапшот: текущий booking.status + статусы конкурентов.
Optimistic: `bookingStore.setStatus(bookingId, "accepted")`.
Optimistic: `lessonStore.optimisticStatusUpdate(lessonId, "scheduled")`.
Rollback: восстановить все затронутые статусы.

#### 3. `cancelBooking`
Снапшот: `bookingStore.snapshotStatus(bookingId)`.
Optimistic: `bookingStore.setStatus(bookingId, "cancelled")`.
Rollback: `bookingStore.restoreStatus(bookingId, snapshot)`.

#### 4. `createBookingRequest`
Optimistic: `bookingStore.optimisticAddRequest(requestEvent)`.
Rollback: `bookingStore.removeRequest(bookingId)`.

#### 5. `publishTutorSchedule`
Снапшот: `scheduleStore.snapshotSchedule(pubkey)`.
Optimistic: `scheduleStore.optimisticUpdateSchedule(pubkey, newSchedule)`.
Rollback: `scheduleStore.restoreSchedule(pubkey, snapshot)`.

#### 6. `publishMuteList`
Optimistic уже есть в `useModeration.addMute` (local setState).
Rollback: при ошибке publish — убрать из Set, показать toast.

#### 7. `sendEncryptedMessage`
Снапшот: `messageStore.snapshotThread(threadKey)`.
Optimistic: добавить сообщение в thread.
Rollback: удалить последнее сообщение из thread.

#### 8. `respondToBooking(reject)`
Снапшот: `bookingStore.snapshotStatus(bookingId)`.
Optimistic: `bookingStore.setStatus(bookingId, "rejected")`.
Rollback: восстановить статус.

#### 9. `publishProfile`
Снапшот: `profileStore.snapshotProfile(pubkey)`.
Optimistic: `profileStore.optimisticUpdateProfile(pubkey, newProfile)`.
Rollback: восстановить profile.

---

## Batch 2 (medium priority)

- `publishBlogPost` / `deleteBlogPost`
- `sendLessonNote` / `shareLessonNote`
- `publishReview`

---

## Архитектурное правило

Хуки — единственное место, где конструируются Use Case'ы и передаются
колбэки `onOptimisticUpdate`/`onRollback`. Компоненты UI не знают об
optimistic/rollback — они просто подписаны на Zustand stores.

Поток:

```
UI (onClick)
  → hook action
    → Use Case.execute()
      → captureSnapshot()
      → onOptimisticUpdate(data, snapshot)  // Zustand → UI immediately
      → await repo.publish()                 // Nostr
      → onRollback(snapshot)                 // только если publish упал
      → throw
    → catch → toast
```

---

## Критерии приёмки

1. Каждый write-сценарий имеет optimistic update в стора до publish
2. Каждый optimistic update имеет rollback: при ошибке publish стора
   возвращается к снапшоту
3. Снапшот захватывается ДО optimistic update, не после
4. Компоненты не знают об optimistic/rollback
5. Все тесты проходят + новые тесты для rollback-сценариев
