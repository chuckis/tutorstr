# План: устранение оставшихся нарушений зависимостей

> Продолжение `docs/plans/dependency_violations_fix.md`. Охватывает три категории
> техдолга, отмеченные пунктиром на `docs/diagrams/actual-dependency-map.mmd`.

---

## 1. Категория 3 (легко): `components/ → ports/`

**Проблема:** 9 компонентов импортируют типы событий напрямую из `ports/`:
`TutorProfileEvent`, `TutorScheduleEvent`, `BookingRequestEvent`,
`BookingStatusEvent`, `ProgressEntryEvent`.

**Решение:** Добавить 5 строк реэкспорта в `hooks/hookTypes.ts` и обновить
импорты в компонентах.

### Шаги

1. **Добавить в `hooks/hookTypes.ts`:**

```typescript
export type { TutorProfileEvent, TutorScheduleEvent } from "../ports/eventTypes";
export type { BookingRequestEvent, BookingStatusEvent } from "../ports/bookingEventsRepository";
export type { ProgressEntryEvent } from "../ports/privateMessagingRepository";
```

2. **Обновить импорты в 11 местах** (9 файлов):

| Файл | Было | Стало |
|------|------|-------|
| `TutorProfileView.tsx` | `from "../ports/bookingEventsRepository"` + `"../ports/privateMessagingRepository"` + `"../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `BookingRequestForm.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `LessonsTab.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `DiscoverTab.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `LessonAgreementsPanel.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `DashboardTab.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |
| `MyBookingRequests.tsx` | `from "../ports/bookingEventsRepository"` | `from "../hooks/hookTypes"` |
| `ProgressEntryList.tsx` | `from "../ports/privateMessagingRepository"` | `from "../hooks/hookTypes"` |
| `TutorCard.tsx` | `from "../ports/eventTypes"` | `from "../hooks/hookTypes"` |

3. **Проверка:** `npx tsc --noEmit` + `npx vitest run`.

**Оценка:** 5 минут, 1 файл редактируется, 9 файлов с заменой импорта (строка).

---

## 2. Категория 2 (средне): `hooks/ → adapters/`

**Проблема:** `useBookings.ts` и `useLessonRepository.ts` импортируют
адаптерные фабрики (`createNostrBookingRepository`,
`createNostrLessonRepository`, `mapNostrBookings`) напрямую из `adapters/`.

**Решение (Вариант A):** Перенести создание репозиториев в `useAppController`,
хуки получают репозиторий через параметр.

### Шаги

1. В `useBookings.ts`: Добавить `bookingRepository: BookingRepository`
   как параметр. Убрать вызов `createNostrBookingRepository` и
   импорт `mapNostrBookings` (перенести в useAppController).
2. В `useLessonRepository.ts`: Добавить `lessonRepository: LessonRepository`
   как параметр. Убрать вызов `createNostrLessonRepository`.
3. В `useAppController.ts`: Создавать репозитории через фабрики и
   передавать в хуки.
4. Удалить импорты `../adapters/nostr/...` из `useBookings.ts` и
   `useLessonRepository.ts`.

---

## 3. Категория 1 (сложно): `hooks/ → nostr/`

**Проблема:** 8 хуков импортируют `nostrClient` напрямую. Нет портовых
интерфейсов для операций, которые они выполняют.

### Анализ операций

| Хук | Операция с nostrClient | Новый порт |
|-----|----------------------|------------|
| `useAuthController` | `setSigner(null/signer)` | `SignerManager` |
| `useNostrKeypair` | `getSignerSession()` | `SignerManager` |
| `useTutorProfile` | `subscribe(kind=30000)` + `publishReplaceableEvent()` | `ProfileRepository` |
| `useTutorDirectory` | `subscribe(kind=30000, limit=200)` | `DirectoryRepository` |
| `useTutorSchedule` | `subscribe(kind=30001)` + `publishReplaceableEvent()` | `ScheduleRepository` |
| `useTutorSchedules` | `subscribe(kind=30001, limit=200)` | `ScheduleRepository` |
| `usePublicAllocatedSlots` | `subscribe(kind=30006, limit=400)` | `PublicLessonRepository` |
| `useRelays` | `setRelays()` | `RelayManager` |

### Проект портов

```typescript
// ports/signerManager.ts
export interface SignerManager {
  setSigner(signer: NostrSigner | null): void;
  getSignerSession(): AuthSession | null;
}
```

```typescript
// ports/profileRepository.ts
export interface ProfileRepository {
  getProfile(pubkey: string, onProfile: (profile: TutorProfileEvent) => void): () => void;
  publishProfile(pubkey: string, profile: TutorProfile, tags: string[][]): Promise<string>;
}
```

```typescript
// ports/directoryRepository.ts
export interface DirectoryRepository {
  subscribeAll(onProfile: (profile: TutorProfileEvent) => void): () => void;
}
```

```typescript
// ports/scheduleRepository.ts
export interface ScheduleRepository {
  getSchedule(pubkey: string, onSchedule: (schedule: TutorScheduleEvent) => void): () => void;
  subscribeAll(onSchedule: (schedule: TutorScheduleEvent) => void): () => void;
  publishSchedule(pubkey: string, schedule: TutorSchedule, tags: string[][]): Promise<void>;
}
```

```typescript
// ports/publicLessonRepository.ts
export interface PublicLessonRepository {
  subscribeAll(onAgreement: (agreement: LessonAgreementEvent) => void): () => void;
}
```

```typescript
// ports/relayManager.ts
export interface RelayManager {
  getRelays(): string[];
  setRelays(relays: string[]): void;
}
```

### План реализации (по частям)

#### Часть A: `SignerManager`
1. Создать `ports/signerManager.ts`
2. Реализовать `adapters/nostr/nostrSignerManager.ts`
3. Зарегистрировать в `RepoContext`
4. `useAuthController` и `useNostrKeypair` читают из контекста

#### Часть B: `ProfileRepository`
1. Создать `ports/profileRepository.ts`
2. Реализовать в `adapters/nostr/profileRepository.ts`
3. Зарегистрировать в `RepoContext`
4. `useTutorProfile.ts` читает из контекста

#### Часть C: `DirectoryRepository`
1. Создать `ports/directoryRepository.ts`
2. Реализовать в `adapters/nostr/directoryRepository.ts`
3. Зарегистрировать в `RepoContext`
4. `useTutorDirectory.ts` читает из контекста

#### Часть D: `ScheduleRepository`
1. Создать `ports/scheduleRepository.ts`
2. Реализовать в `adapters/nostr/scheduleRepository.ts`
3. Зарегистрировать в `RepoContext`
4. `useTutorSchedule.ts` и `useTutorSchedules.ts` читают из контекста

#### Часть E: `PublicLessonRepository`
1. Создать `ports/publicLessonRepository.ts`
2. Реализовать в `adapters/nostr/publicLessonRepository.ts`
3. Зарегистрировать в `RepoContext`
4. `usePublicAllocatedSlots.ts` читает из контекста

#### Часть F: `RelayManager`
1. Создать `ports/relayManager.ts`
2. Реализовать в `adapters/nostr/relayManager.ts`
3. Зарегистрировать в `RepoContext`
4. `useRelays.ts` читает из контекста

### Итоговая архитектура

После всех частей:
- `hooks/` не импортирует `../nostr/` вообще
- Все операции с `nostrClient` — в адаптерах
- Хуки получают порты через `hooks/RepoContext`
- `ports/` содержит только интерфейсы
- `adapters/` реализует порты и импортирует `nostrClient`

---

## 4. Приоритеты

| Приоритет | Категория | Файлов | Риск | Время |
|-----------|-----------|--------|------|-------|
| **P0** | Категория 3 (реэкспорт типов) | 10 | Низкий | 5 мин |
| **P1** | Категория 2 (фабрики в useAppController) | 3 | Средний | 30-40 мин |
| **P2** | Категория 1, Часть A (SignerManager) | 4 | Средний | 20 мин |
| **P3** | Категория 1, Части B-F (остальные порты) | ~20 | Высокий | 2-3 часа |

**Рекомендация:** начать с P0 (быстрая победа), затем P1 (средняя
сложность), затем P2-P3 по мере возможности.

---

## 5. Верификация

После каждого шага:

```bash
npx tsc --noEmit      # нет новых ошибок типов
npx vitest run         # все тесты проходят
grep -rn 'from.*\.\./nostr/' src/hooks/ --include='*.ts' --include='*.tsx'
# 0 результатов — цель
```

Обновить `docs/diagrams/actual-dependency-map.mmd` после завершения всех
шагов: убрать пунктирные линии `hooks → nostr`, `hooks → adapters`,
`components → ports`.
