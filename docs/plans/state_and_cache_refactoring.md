# State and Cache Refactoring Plan

Согласованный план рефакторинга архитектуры управления данными TutorHub на основе
`docs/spec.md` и ТЗ (Техническое задание от 19.06.2026).

---

## Текущее состояние (June 2026)

- Clean Architecture слои есть: `domain/`, `ports/`, `adapters/`, `application/`, `hooks/`, `components/`
- Zustand используется **только** как кэш событий Nostr (`eventBus.ts`), не как SSOT
- Все бизнес-данные живут в `useState` внутри 11+ хуков — теряются при unmount
- Нет исторической `REQ`-гидратации при старте приложения
- Логика фильтрации времени (`isSlotInPast`, `new Date()`) размазана по компонентам
- Паттерн `useEffect → subscribe → setState → LOAD_TIMEOUT` повторяется в каждом hook

---

## Целевая архитектура

```
Nostr Relay → NostrClient → subscriptionManager → eventBus (Zustand event cache)
                                                        ↓
                                              Zustand Domain Stores (SSOT)
                                                        ↓
                                              hooks (thin selectors + actions)
                                                        ↓
                                              components (чистые props)
```

---

## Фаза 1: Zustand Domain Stores (фундамент)

Создать `frontend/src/stores/` с пятью stores:

| Store | Данные | Kind |
|---|---|---|
| `profileStore` | профили (keyed by pubkey) | 0 / 30000 |
| `scheduleStore` | расписания (keyed by pubkey) | 30001 |
| `bookingStore` | заявки + статусы (kinds 30002, 30003) | 30002, 30003 |
| `lessonStore` | соглашения о занятиях (kind 30006) | 30006 |
| `messageStore` | сообщения (thread-based) | 4, 30004 |

**Требования к каждому store:**

- Метод `ingest(event: NostrEvent)` — дедупликация по `id` + `created_at`
- Флаг `hydrated: boolean` — устанавливается после EOSE исторического REQ
- Селекторы — чистые функции домена
- Доступ из адаптеров через `store.getState().ingest(event)` (вне React)
- Доступ из хуков через `useXxxStore(selector)` (в React)

**Поток данных:**

```
eventBus.ts:emitEvent() → store.getState().ingest(event)
                         → kindListeners (старый путь, для обратной совместимости)
```

---

## Фаза 2: Историческая гидратация + Live Merge

**Проблема:** При старте `subscriptionManager` подписывается только на лайв-ленту.
Исторические события из реле не запрашиваются — UI пуст, пока не придёт новое событие.

**Решение:**

1. Создать `hydrationService.ts`
2. При монтировании `RepoProvider` делает `REQ` для каждого вида событий:
   - `{ kinds: [0, 30001, 30002, 30003, 30004, 30006, 32267], limit: 500 }`
3. На каждый `EVENT` → `emitEvent(event)` (текущий путь в eventBus)
4. На `EOSE` → `store.getState().setHydrated(true)`
5. Live-события продолжают литься через тот же `emitEvent`
6. Хуки ждут `hydrated === true` перед рендером данных (убирает `LOAD_TIMEOUT`)

---

## Фаза 3: Рефакторинг хуков → селекторы stores

**Паттерн-замена для 11 хуков:**

```typescript
// Было (useTutorSchedules.ts, useBookingRequestsForTutor.ts, …)
const [data, setData] = useState({});
useEffect(() => {
  const unsub = repo.subscribe((event) => setData(event));
  return unsub;
}, []);

// Стало
const data = useScheduleStore((s) => s.byPubkey);
const hydrated = useScheduleStore((s) => s.hydrated);
```

**Что остаётся в хуках:**
- Action-методы (publish, cancel, accept, respond)
- Навигация
- Локальные UI-состояния (статус отправки, ошибки)

**Что уходит из хуков:**
- `useState` для данных
- `LOAD_TIMEOUT` и таймеры
- Подписки через `addKindListener` (заменяются на чтение из stores)
- `localStorage` кэш (заменяется Zustand + гидратация)

---

## Фаза 4: Централизация фильтрации слотов по времени

**Проблема:** `isSlotInPast(s)` вызывается прямо в `DiscoverTab.tsx:198`;
`tutorIsAvailableNow` и `tutorHasFreeSlotsThisWeek` используют `new Date()` без реактивности.

**Решение:**

1. Создать `hooks/useSlotFilter.ts`:

```typescript
function useSlotFilter(pubkey: string) {
  const now = useCurrentTime(60_000);
  const schedule = useScheduleStore((s) => s.byPubkey[pubkey]);
  return useMemo(() => ({
    futureSlots: schedule?.slots.filter((s) => !isSlotInPast(s, now)) ?? [],
    isAvailableNow: tutorIsAvailableNow(schedule, pubkey, occupiedKeys, now),
    hasFreeSlotsThisWeek: tutorHasFreeSlotsThisWeek(schedule, pubkey, occupiedKeys, now),
  }), [schedule, now, occupiedKeys]);
}
```

2. Переделать сигнатуры `tutorIsAvailableNow` / `tutorHasFreeSlotsThisWeek` —
   добавить параметр `now: number` вместо `new Date()` внутри

3. Убрать `isSlotInPast` из `DiscoverTab.tsx` — компонент получает готовые `futureSlots`

4. Запрет на `setInterval` и `new Date()` в UI-компонентах

---

## Критерии приемки (Acceptance Criteria)

1. **SSOT:** Все бизнес-данные читаются из Zustand stores, не из `useState`
2. **Гидратация:** После `EOSE` данные отображаются без LOAD_TIMEOUT
3. **Реактивность:** Live-события обновляют store → только подписанные компоненты ререндерятся
4. **Изоляция времени:** Ни один компонент не вызывает `isSlotInPast` или `new Date()` для фильтрации слотов
5. **Чистота слоёв:** `domain/` и `application/` не импортят `nostr-tools`
6. **Тесты:** Каждый store и useSlotFilter покрыты тестами

## Функциональные требования к управлению состоянием (дополнение)

### 3.3. Оптимистичные обновления (Optimistic UI)

Для всех интерактивных действий пользователя (запись на урок, отмена слота, и т.п.)
использовать паттерн оптимистичного апдейта. Изменения должны мгновенно отражаться в
Zustand-сторе и IndexedDB до фактического получения ответа от Nostr-реле.

В случае сетевой ошибки или таймаута система должна автоматически производить откат
(rollback) состояния к исходному и уведомлять пользователя.

**Реализация:**

1. **Локализация в Use Case** — каждый бизнес-сценарий, выполняющий запись, принимает
   опциональный callback `onOptimisticUpdate?: (…data…) => void` в конструктор.
   Use Case вызывает этот callback **до** вызова порта (сетевого publish), после
   валидации и `assertRole`.

2. **Координация через Zustand** — callback пишет напрямую в соответствующий
   `Zustand Store` через `store.getState().метод()`. Компоненты не знают об
   optimistic update — они просто подписаны на хранилище.

3. **Снапшот для rollback** — перед optimistic update Use Case запоминает текущее
   состояние затронутых сущностей. При ошибке publish (выброшенном исключении из
   порта) Use Case восстанавливает снапшот в store и пробрасывает ошибку наверх,
   где хук/экшн показывает уведомление.

4. **Жизненный цикл:**

```
Пользователь нажал "Complete"
  → Use Case.execute()
    → валидация + assertRole
    → снапшот текущего состояния
    → optimisticStatusUpdate(lessonId, "completed")  // Zustand → UI
    → lessons.updateStatus()                          // Nostr publish
    → если ошибка: rollback снапшота → throw
  → хук ловит ошибку → toast об ошибке
  → реальный event с реле позже подтвердит или скорректирует статус
```

5. **Уже реализовано:** `ChangeLessonStatus` принимает `onOptimisticUpdate` callback
   и вызывает его до publish. `useAppActions` передаёт `useLessonStore.getState().optimisticStatusUpdate`.
