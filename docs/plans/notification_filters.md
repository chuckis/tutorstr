# Фильтры уведомлений и last_seen курсор

## Проблемы

1. **Self-уведомления.** Пользователь получает уведомление о событиях, которые сам же совершил:
   - Отправка сообщения → toast «New message» (собственное сообщение).
   - Подтверждение/отклонение бронирования → toast об изменении статуса.

2. **Нет курсора last_seen.** При повторном входе нет возможности увидеть только пропущенные события — все подписки используют только `limit`, без `since`. Нет сохранения временно́й метки в localStorage.

## Решение

### Part 1 — Исправление self-уведомлений

**Файл:** `frontend/src/hooks/useAppController.ts`

- **Строка 170:** `msg.counterparty !== keypair.pubkey` → `msg.pubkey !== keypair.pubkey`
  При отправке сообщения `pubkey` = отправитель (сам пользователь), `counterparty` = получатель.
  Старая проверка пропускала чужие сообщения (`counterparty !== self` → true для исходящих).

- **Строка 188:** Добавить `if (statusEvent.pubkey === keypair.pubkey) continue;`
  Статус бронирования, опубликованный самим пользователем (tutor подтверждает), не должен триггерить toast.

### Part 2 — Утилита notificationCursor.ts

**Новый файл:** `frontend/src/utils/notificationCursor.ts`

```ts
const KEY = "tutorhub:last_seen_time";

export function getNotificationSince(): number {
  const stored = Number(localStorage.getItem(KEY));
  return stored || Math.floor(Date.now() / 1000) - 86400;
}

export function updateNotificationCursor(): void {
  localStorage.setItem(KEY, String(Math.floor(Date.now() / 1000)));
}
```

- `getNotificationSince()` — читает сохранённую метку, по умолчанию 24 часа назад.
- `updateNotificationCursor()` — пишет текущий unix timestamp.

### Part 3 — `since` в подписки, триггерящие уведомления

Только 3 метода репозиториев (те, чьи события проверяются в `useAppController` notification-эффектах):

| Порт | Метод | Kinds | Подписки |
|------|-------|-------|----------|
| `privateMessagingRepository.ts` | `subscribeMessagesForUser` | kind 4 | `#p` + `authors` |
| `bookingEventsRepository.ts` | `subscribeRequestsForTutor` | kind 30002 | `#p` |
| `bookingEventsRepository.ts` | `subscribeStatusesForUser` | kind 30003 | `#p` + `authors` |

Изменения:
1. **Порты** — добавить опциональный параметр `since?: number` в сигнатуру метода.
2. **Адаптеры** — включить `since` в `NostrFilter`, если передан.
3. **Хуки-подписчики** — вызвать `getNotificationSince()` и передать в метод репозитория.

**Не изменяются** (не триггерят уведомления):
- `subscribeRequestsByUser` — outgoing, для UI/бейджей, не для тостов.
- `subscribeProgressEntriesForUser` — не используется в `useAppController`.
- `subscribeForUser` (kind 30006) — нет notification-эффекта на lesson agreements.
- `subscribeNotesForLesson` — нет notification-эффекта.

#### Детали по файлам

**Порты:**
- `ports/privateMessagingRepository.ts` — `subscribeMessagesForUser(pubkey, onMessage, since?)`
- `ports/bookingEventsRepository.ts` — `subscribeRequestsForTutor(pubkey, onRequest, since?)`, `subscribeStatusesForUser(pubkey, onStatus, since?)`

**Адаптеры:**
- `adapters/nostr/privateMessagingRepository.ts` — в `subscribeMessagesForUser`: обе подписки (incoming `#p` + outgoing `authors`) получают `since` в фильтре.
- `adapters/nostr/bookingEventsRepository.ts` — `subscribeRequestsForTutor`: `since` в `#p` фильтр. `subscribeStatusesForUser`: `since` в обе подписки.

**Хуки:**
- `hooks/useEncryptedMessages.ts` — импорт `getNotificationSince`, передача `since` в `subscribeMessagesForUser`.
- `hooks/useBookingRequestsForTutor.ts` — импорт `getNotificationSince`, передача `since` в `subscribeRequestsForTutor`.
- `hooks/useBookingStatusesForUser.ts` — импорт `getNotificationSince`, передача `since` в `subscribeStatusesForUser`.

### Part 4 — Сохранение курсора при закрытии/фоне

**Новый файл:** `frontend/src/hooks/useNotificationCursor.ts`

Хук, который:
- На `beforeunload` → `updateNotificationCursor()`
- На `visibilitychange` (document.hidden) → `updateNotificationCursor()`
- Каждые 60 секунд → `updateNotificationCursor()`

**Интеграция:** вызвать хук в `App.tsx` (один раз на уровне приложения).

### Part 5 — Тестирование

- Проверить, что отправка сообщения не вызывает toast.
- Проверить, что подтверждение бронирования не вызывает toast у подтверждающего.
- Проверить, что при повторном открытии подставляется `since` и пропущенные события приходят.

## Файлы для изменения

```
M  frontend/src/hooks/useAppController.ts          (2 строки)
A  frontend/src/utils/notificationCursor.ts         (новый)
A  frontend/src/hooks/useNotificationCursor.ts      (новый)
M  frontend/src/ports/privateMessagingRepository.ts (1 сигнатура)
M  frontend/src/ports/bookingEventsRepository.ts    (2 сигнатуры)
M  frontend/src/adapters/nostr/privateMessagingRepository.ts (since в фильтры)
M  frontend/src/adapters/nostr/bookingEventsRepository.ts    (since в фильтры)
M  frontend/src/hooks/useEncryptedMessages.ts       (передать since)
M  frontend/src/hooks/useBookingRequestsForTutor.ts (передать since)
M  frontend/src/hooks/useBookingStatusesForUser.ts  (передать since)
M  frontend/src/App.tsx                             (вызвать хук)
```
