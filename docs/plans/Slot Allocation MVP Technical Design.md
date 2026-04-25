# Slot Allocation MVP Technical Design

## 1. Purpose

Этот документ переводит план `Slot Allocation and Auction Resolution` в реалистичный MVP-дизайн под текущую архитектуру frontend.

Задача:

- не вводить новый kind
- минимально расширить текущие `30002` / `30003`
- сохранить совместимость с уже существующим booking flow
- подготовить код к future auction strategy

## 2. Current Constraints

Текущая реализация уже имеет:

- `30002` для `BookingRequest`
- `30003` для `BookingStatus`
- `AcceptBooking` use case, который принимает один `bookingId`
- `useBookings.ts`, который собирает booking read model из requests + statuses

Главное ограничение сейчас:

- система оперирует отдельными booking threads
- система не оперирует allocation group для общего slot

Поэтому MVP-дизайн должен добавить allocation semantics поверх существующего flow, а не переписать всё заново.

## 3. Data Model Changes

### 3.1 BookingRequest payload

Расширить `BookingRequest`:

```ts
export type BookingRequest = {
  bookingId: string;
  requestedSlot: ScheduleSlot;
  message: string;
  studentNpub: string;
  slotAllocationKey?: string;
};
```

Назначение:

- хранить ключ scarce resource прямо в request event
- не вычислять его заново в каждом месте из tutor + slot

Важно:

- поле optional для backward compatibility
- для старых events ключ можно вычислять fallback-логикой на клиенте

### 3.2 BookingStatus payload

Расширить `BookingStatus`:

```ts
export type BookingStatusReason =
  | "tutor_rejected"
  | "duplicate_bid"
  | "slot_filled"
  | "student_cancelled";

export type BookingStatus = {
  bookingId: string;
  status: "accepted" | "rejected" | "completed" | "cancelled";
  note?: string;
  reason?: BookingStatusReason;
  slotAllocationKey?: string;
};
```

Назначение:

- различать обычный reject и reject из-за allocation resolution
- дублировать `slotAllocationKey` в status event для более простого анализа и отладки

### 3.3 Domain model

Расширить `frontend/src/domain/booking.ts`:

```ts
export type Booking = {
  id: string;
  tutorId: string;
  studentId: string;
  scheduledAt: string;
  scheduledEnd?: string;
  status: BookingStatus;
  requestEventId?: string;
  slotAllocationKey: string;
  resolutionReason?: "tutor_rejected" | "duplicate_bid" | "slot_filled" | "student_cancelled";
};
```

Это нужно, чтобы allocation logic жила в domain/read-model, а не в raw event parsing.

## 4. Key Helpers

Создать helper, например:

- `frontend/src/domain/slotAllocation.ts`

Содержимое:

```ts
import { ScheduleSlot } from "../types/nostr";

export function makeSlotAllocationKey(tutorPubkey: string, slot: ScheduleSlot) {
  return [tutorPubkey, slot.start, slot.end].join("|");
}

export function makeSlotBidKey(
  tutorPubkey: string,
  studentPubkey: string,
  slot: ScheduleSlot
) {
  return [makeSlotAllocationKey(tutorPubkey, slot), studentPubkey].join("|");
}

export function isActiveBookingStatus(status: string) {
  return status === "pending" || status === "accepted";
}
```

Нужно именно вынести это в одно место, иначе ключи быстро "расползутся" по разным хукам и компонентам.

## 5. Adapter Changes

### 5.1 bookingAdapter.ts

`bookingFromNostr()` должен:

- читать `request.slotAllocationKey`, если он есть
- иначе вычислять fallback через `tutorPubkey + requestedSlot.start + requestedSlot.end`
- протягивать `status.reason`, если он есть

Итог:

- любой `Booking` в приложении уже содержит `slotAllocationKey`
- read-model больше не зависит от знания raw request payload в каждом месте

### 5.2 Backward compatibility rule

Если event был опубликован до введения новых полей:

- `slotAllocationKey` вычисляется локально
- `resolutionReason` остаётся `undefined`

Это позволит не ломать текущие данные в relays.

## 6. Read Model Design

### 6.1 Base objects

Оставляем:

- `incoming`
- `outgoing`
- `requestMap`

Добавляем derived structures в `useBookings.ts`.

### 6.2 Allocation group index

```ts
requestsByAllocationKey: Record<string, Booking[]>
```

Правила:

- группируем все incoming/outgoing bookings по `slotAllocationKey`
- внутри группы сортируем по `created_at` request event или по order появления

Назначение:

- tutor может видеть конкуренцию за слот
- accept flow может находить competing requests

### 6.3 Winner index

```ts
winnerByAllocationKey: Record<string, Booking>
```

Правила:

- winner = booking со статусом `accepted`
- если accepted несколько, брать наиболее поздний по status event и считать это data inconsistency
- при inconsistency UI может использовать последний accepted как effective winner

Это позволит:

- быстро проверять, allocated ли слот
- блокировать новые publishes

### 6.4 Student active bid index

```ts
activeBidBySlotAndStudent: Record<string, Booking>
```

Ключ:

- `slotBidKey`

Назначение:

- блокировать duplicate bid от одного student на тот же slot

### 6.5 Optional conflict diagnostics

Полезно вернуть ещё один derived list:

```ts
allocationConflicts: Array<{
  slotAllocationKey: string;
  acceptedBookings: Booking[];
}>
```

Это не обязательно для MVP UI, но сильно упростит отладку inconsistent relay state.

## 7. Repository Contract Changes

Текущий `BookingRepository` слишком узкий для allocation resolution.

Нужно расширить интерфейс:

```ts
export interface BookingRepository {
  getIncoming(userId: string): Promise<Booking[]>;
  getOutgoing(userId: string): Promise<Booking[]>;
  getById(id: string): Promise<Booking | null>;
  updateStatus(
    id: string,
    status: Booking["status"],
    options?: { reason?: Booking["resolutionReason"] }
  ): Promise<void>;
  getByAllocationKey(allocationKey: string): Promise<Booking[]>;
}
```

Почему это нужно:

- `AcceptBooking` должен работать не только с одной записью, но и со всей allocation group

## 8. Write Path Design

### 8.1 publishBookingRequest

В `useBookingActions.ts`:

- вычислять `slotAllocationKey` до публикации
- добавлять его в `BookingRequest`
- по возможности дублировать в tag, например:
  - `["slot", slotAllocationKey]`

Это упростит будущую индексацию на relay side.

### 8.2 requestPublishedSlot

В `useAppActions.ts`:

Перед publish:

1. вычислить `slotAllocationKey`
2. проверить `winnerByAllocationKey`
3. проверить `activeBidBySlotAndStudent`
4. если слот уже allocated, показать `Slot is no longer available.`
5. если у этого student уже есть active bid, показать `You already requested this slot.`
6. только после этого публиковать request

Это должно быть обязательной write-time validation, а не только UI hint.

### 8.3 cancel flow

При `cancelled` от student:

- allocation group не закрывается полностью
- если winner ещё нет, slot может снова принимать другие bids
- если cancel делает winner после accept, это отдельная policy decision

Для MVP рекомендую:

- `cancelled` победившего booking не переоткрывает слот автоматически

Иначе появится скрытая сложность с lesson rollback.

## 9. Accept Flow Redesign

### 9.1 Current issue

Сейчас `AcceptBooking.execute(bookingId)`:

- принимает один booking
- ставит ему `accepted`
- создаёт lesson

Но не завершает allocation group.

### 9.2 New behavior

`AcceptBooking.execute(bookingId)` должен:

1. загрузить выбранный booking
2. взять `slotAllocationKey`
3. получить всю allocation group через `getByAllocationKey()`
4. проверить, есть ли уже другой winner в группе
5. если winner уже есть и это не текущий booking, завершиться с ошибкой или no-op
6. обновить выбранный booking в `accepted`
7. создать `LessonAgreement`
8. для остальных active bookings в группе опубликовать:
   - `status = rejected`
   - `reason = slot_filled`

### 9.3 Suggested implementation shape

Вариант без сильной ломки use case:

```ts
export class AcceptBooking {
  async execute(bookingId: string) {
    const booking = await this.bookingRepo.getById(bookingId);
    if (!booking) return;

    const group = await this.bookingRepo.getByAllocationKey(
      booking.slotAllocationKey
    );

    const existingWinner = group.find(
      (item) => item.status === "accepted" && item.id !== booking.id
    );
    if (existingWinner) {
      throw new Error("Slot already allocated.");
    }

    await this.bookingRepo.updateStatus(booking.id, "accepted");
    await this.lessonRepo.save(this.createLesson(...));

    await Promise.all(
      group
        .filter((item) => item.id !== booking.id)
        .filter((item) => item.status === "pending")
        .map((item) =>
          this.bookingRepo.updateStatus(item.id, "rejected", {
            reason: "slot_filled"
          })
        )
    );
  }
}
```

Если захотим лучшую согласованность, позже можно сделать отдельный allocation service.

## 10. UI Contract Changes

### 10.1 Student discover UI

`DiscoverTab.tsx` должно получать:

- `winnerByAllocationKey`
- `activeBidBySlotAndStudent`

Для каждого published slot:

- если есть winner -> `Unavailable`
- если есть active bid текущего student -> `Requested`
- иначе -> `Request this slot`

### 10.2 BookingRequestForm

Для select/custom flow нужна одинаковая проверка:

- если slot уже unavailable, submit disabled
- если slot already requested by this student, submit disabled

### 10.3 Tutor requests UI

Позже желательно визуально группировать входящие заявки по `slotAllocationKey`.

Для MVP можно начать с простого:

- добавить derived grouping в data layer
- UI grouping сделать вторым этапом

## 11. Incremental Rollout

Рекомендую внедрять в 4 этапа.

### Phase 1

- добавить `slotAllocationKey` helper
- расширить types
- научить adapter заполнять `slotAllocationKey`

### Phase 2

- добавить derived indices в `useBookings`
- заблокировать duplicate bid и request to already allocated slot

### Phase 3

- расширить `BookingRepository`
- переписать `AcceptBooking` на resolution всей allocation group

### Phase 4

- улучшить tutor UI: grouping by slot
- показать `slot_filled` / `requested` / `unavailable`

## 12. Compatibility Notes

Нужно сохранить работу со старыми событиями.

Правила:

- отсутствие `slotAllocationKey` не ломает чтение
- отсутствие `reason` не ломает status parsing
- старые bookings попадают в allocation group через fallback key builder

Это особенно важно, потому что relay history уже может содержать старые request events.

## 13. Open Questions

- Нужно ли разрешать повторный bid после `slot_filled`, если позже winner cancels lesson?
- Нужно ли отдельное состояние `expired`, если slot time уже прошёл?
- Нужно ли в MVP хранить `slotAllocationKey` ещё и в `LessonAgreement` для traceability?
- Должен ли tutor иметь возможность вручную re-open slot после allocation?

Пока можно двигаться без этих решений, если зафиксировать conservative policy:

- accepted booking закрывает слот
- проигравшие заявки получают `rejected + reason=slot_filled`
- слот не переоткрывается автоматически

## 14. Done Criteria

Техдизайн считается реализованным, если:

- все новые booking requests публикуются с `slotAllocationKey`
- read-model умеет строить allocation groups и winners
- duplicate bid от одного student на тот же slot блокируется
- accept одного booking автоматически завершает остальные active bids на этот slot
- UI использует allocation state вместо простого списка независимых threads
