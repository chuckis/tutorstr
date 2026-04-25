# Slot Allocation and Auction Resolution

## 1. Reframing The Problem

Проблема здесь не только в duplicate requests.

На самом деле опубликованный tutor slot является дефицитным ресурсом, а входящие booking requests на этот слот образуют allocation problem:

- несколько студентов могут претендовать на один и тот же слот
- один студент не должен иметь возможность "заспамить" этот слот несколькими заявками
- после выбора победителя слот должен считаться распределённым
- остальные заявки на тот же слот должны перейти в проигравшее состояние

Если в будущем захотим автоматизировать выбор победителя по цене, приоритету или времени ответа, это уже будет auction / allocation mechanism.

Для MVP нужен не полный аукцион, а корректная модель allocation.

## 2. Goal

Ввести в продукт явную модель распределения слотов, где:

- каждый published slot может быть allocated только одному student
- все requests на один и тот же slot считаются competing requests в одной allocation group
- студент не может создавать несколько активных requests в одной и той же allocation group
- после accept одной заявки остальные конкурирующие заявки автоматически становятся non-winning

## 3. Current Gap

Сейчас система мыслит через `bookingId`, а не через "slot as scarce resource".

Из-за этого:

- каждая новая заявка создаёт новый thread независимо от того, на какой slot она отправлена
- нет общего идентификатора конкурентного пула заявок на один slot
- нет механизма выбора winner внутри этого пула
- нет механизма массового отклонения остальных заявок после allocation
- duplicate request от того же студента выглядит как ещё один независимый thread

Итог: текущее поведение моделирует сообщения о намерении, но не моделирует распределение ограниченного слота.

## 4. Recommended Domain Model

Нужно ввести отдельную доменную сущность:

- `slotAllocationKey`

Формула MVP:

- `tutorPubkey + "|" + slot.start + "|" + slot.end`

Это ключ дефицитного ресурса.

Отдельно нужен:

- `slotBidKey`

Формула:

- `slotAllocationKey + "|" + studentPubkey`

Где:

- `slotAllocationKey` определяет общий конкурс за слот
- `slotBidKey` определяет уникальную заявку конкретного студента в этом конкурсе

Такое разделение даёт правильную семантику:

- один slot -> много кандидатов
- один student -> максимум одна активная заявка на конкретный slot

## 5. Product Rules

### 5.1 One student, one active bid per slot

Если студент уже имеет активную заявку на этот `slotAllocationKey`, новая заявка не публикуется.

Активные состояния:

- `pending`
- `accepted`

Повторный bid допустим, если предыдущий bid этого студента:

- `rejected`
- `cancelled`

### 5.2 One slot, one winner

Для каждого `slotAllocationKey` может существовать только один winner.

Если tutor принимает одну заявку на слот:

- эта заявка получает `accepted`
- lesson agreement создаётся только для неё
- остальные competing requests на тот же `slotAllocationKey` переводятся в `rejected` или отдельный reason вроде `slot_filled`

### 5.3 Slot visibility after allocation

После появления winner:

- slot больше не должен отображаться как доступный для новых requests
- студентам нужно показывать, что слот уже allocated

## 6. Event Model Implication

Текущих kinds в MVP в целом достаточно, но в payload/tag model не хватает явного ключа allocation group.

Рекомендуемое расширение для `BookingRequest`:

- добавить `slotAllocationKey`

Рекомендуемое расширение для `BookingStatus`:

- сохранить `bookingId`
- добавить optional `reason`, например:
  - `duplicate_bid`
  - `slot_filled`
  - `tutor_rejected`

Дополнительно полезно дублировать `slotAllocationKey` в tags, чтобы потом было проще индексировать через relay:

- `["a", "<slotAllocationKey>"]` или кастомный `["slot", "<slotAllocationKey>"]`

Для MVP можно начать даже без нового event kind.
Достаточно расширить содержимое существующих `30002` и `30003`.

## 7. MVP Allocation Strategy

Полноценный auction mechanism пока не нужен.

Для MVP рекомендуем deterministic allocation policy:

- winner выбирается tutor вручную
- если tutor accepts request, это означает allocation slot студенту
- остальные активные заявки на тот же slot автоматически проигрывают

Это "manual winner selection", но уже внутри корректной allocation model.

Позже сюда можно добавить стратегии:

- first-come-first-served
- highest bid
- tutor-defined scoring
- deadline-based batch allocation

## 8. Read Model Changes

Нужно построить два индекса.

### 8.1 Allocation groups

Например в `useBookings.ts` или в отдельном hook:

- `requestsByAllocationKey: Record<string, Booking[]>`

Назначение:

- собрать всех кандидатов на один slot
- определить, есть ли уже winner
- показать tutor competing demand на слот

### 8.2 Student bid index

- `activeBidByStudentAndSlot: Record<string, Booking>`

Ключ:

- `slotBidKey`

Назначение:

- блокировать повторную заявку от того же student на тот же slot

## 9. Write Path Changes

### 9.1 On request publish

Перед `publishBookingRequest()`:

- вычислить `slotAllocationKey`
- вычислить `slotBidKey`
- проверить, нет ли уже активного bid этого student на этот slot
- проверить, не allocated ли slot уже другому student

Если одно из условий выполняется:

- event не публикуется
- пользователь получает понятное сообщение

### 9.2 On tutor accept

При accept заявки:

1. определить `slotAllocationKey` выбранной заявки
2. убедиться, что winner для этого slot ещё не существует
3. пометить выбранную заявку как `accepted`
4. создать `LessonAgreement`
5. найти остальные активные requests в той же allocation group
6. опубликовать для них `rejected` с `reason = slot_filled`

Это ключевой момент: accept должен завершать allocation group, а не только менять статус одной записи.

### 9.3 On slot removal from schedule

Если tutor убирает slot из schedule, нужно отдельно решить политику:

- либо только скрыть его для новых requests
- либо автоматически отменять все pending requests на него

Для MVP достаточно зафиксировать:

- удаление slot из schedule не меняет автоматически существующие requests

Но это стоит явно задокументировать.

## 10. UI Changes

### 10.1 Student side

- уже отправленный bid на slot показывать как `Requested`
- allocated slot показывать как `Unavailable`
- отключать кнопку повторной заявки

### 10.2 Tutor side

Tutor должен видеть competing requests grouped by slot, а не только линейный список booking threads.

Например:

- slot `2026-05-01 15:00-16:00`
- candidates: 3 students
- action: choose winner

Это позволит UI отражать реальную allocation problem.

## 11. Suggested File Scope

- `frontend/src/types/nostr.ts`
- `frontend/src/adapters/nostr/bookingAdapter.ts`
- `frontend/src/domain/booking.ts`
- новый helper в `frontend/src/domain` или `frontend/src/utils` для allocation keys
- `frontend/src/hooks/useBookings.ts`
- `frontend/src/hooks/useAppActions.ts`
- `frontend/src/application/usecases/acceptBooking.ts`
- tutor request UI components
- student request / discover UI components

## 12. Testing Strategy

Минимальные кейсы:

- один студент не может создать второй active bid на тот же slot
- два студента могут создать competing bids на один slot
- после accept одного bid остальные bids в группе становятся rejected
- после allocation новые bids на этот slot не публикуются
- `rejected` по причине `tutor_rejected` позволяет студенту подать заново
- `rejected` по причине `slot_filled` не должен возрождать слот как доступный

Отдельно полезны чистые unit tests на:

- `makeSlotAllocationKey`
- `makeSlotBidKey`
- winner detection
- competing request resolution

## 13. Decentralization Limitation

Нужно честно зафиксировать ограничение:

без relay-side enforcement это остаётся optimistic allocation model на клиенте и на основе видимых events.

То есть:

- наш клиент будет вести себя консистентно
- наш tutor UI сможет правильно выбирать winner
- наш student UI не будет отправлять лишние bids

Но другой клиент без этой логики теоретически всё ещё может создать конфликтующий request.

Полное решение потребует либо:

- relay-side allocation rules
- либо отдельного coordinator service
- либо строгой replaceable/addressable модели для slot claims

## 14. Acceptance Criteria

- слот моделируется как shared scarce resource, а не как набор независимых booking threads
- один student не может держать больше одного active bid на один slot
- один slot может иметь только одного accepted winner
- accept автоматически завершает competing requests на тот же slot
- student UI и tutor UI отражают allocation state, а не только raw request list
- архитектура допускает будущий переход от manual allocation к auction strategy
