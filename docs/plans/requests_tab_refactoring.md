# Refactoring план: RequestsTab.tsx

## Текущие проблемы (blockers)

1. **Нет профилей студентов** — `useTutorDirectory` подписывается только на `role === "tutor"`. Студенческие профили (аватар, имя, bio) недоступны для отображения в заявке.
2. **Нет истории статусов** — `useBookingStatusesForUser` собирает `BookingStatusEvent[]`, но они не проброшены в view model. В `Booking` только текущий `status` и один `resolutionReason`.
3. **RequestDetailsView внутри RequestsTab.tsx** — не вынесен, нельзя развивать и тестировать отдельно.
4. **Нет навигации "открыть профиль"** — `useAppNavigation` хранит `selectedTutor`, но нет механизма перейти из заявки в профиль контрагента.
5. **Вьюмодель плоская** — `SelectedRequestViewModel` несёт только имя строкой, без аватара, bio, предметов.
6. **Мобильный UI не оптимизирован** — `DetailPageLayout` статичен, нет сворачиваемого заголовка, нет sticky bottom bar для действий.
7. **Кнопки accept/decline в списке** — провоцируют действие без контекста детального просмотра.

## Порядок фаз

### Фаза 0 — Студенческие профили
**Файлы:** `useStudentProfiles.ts` (новый), `useAppController.ts`, `useRequestsTabViewModel.ts`

Создать хук `useStudentProfiles`, который подписывается на `profileEventRepository.subscribe()` для списка pubkey. Не фильтрует по роли.

В `useAppController` добавить вызов, пробросить результат как `counterpartyProfiles` в `useRequestsTabViewModel`.

### Фаза 1 — Проброс статус-ивентов
**Файлы:** `useBookings.ts`, `buildRequestsTabViewModel.ts`

Экспортировать `statuses` из `useBookings`. Добавить `StatusHistoryEntry[]` в `SelectedRequestViewModel`.

### Фаза 2 — Расширение SelectedRequestViewModel
**Файлы:** `buildRequestsTabViewModel.ts`

Добавить поля: `counterpartyProfile`, `viewerRole`.

### Фаза 3 — Выделение RequestDetailsView
**Новые файлы:** `RequestDetailsView.tsx`, `CounterpartyCard.tsx`, `RequestStatusHistory.tsx`

Детальный экран: карточка контрагента, информация о слоте, таймлайн статусов, чат.

### Фаза 4 — Навигация "профиль из заявки"
**Файлы:** `RequestDetailsView.tsx`, `App.tsx`

Переиспользовать `setSelectedTutor` из `useAppNavigation`. Кнопка "Посмотреть профиль" в `CounterpartyCard`.

### Фаза 5 — Mobile-оптимизации
**Файлы:** `DetailPageLayout.tsx`, `RequestActionBar.tsx` (новый)

Collapsible header + sticky action bar на мобильных.

### Фаза 6 — Чистка RequestsTab.tsx
**Файлы:** `RequestsTab.tsx`

Удалить `RequestDetailsView` из файла, импортировать из нового.

### Фаза 7 — Интеграция в App.tsx
**Файлы:** `App.tsx`, `useAppController.ts`

Финальная проводка всех пропсов.
