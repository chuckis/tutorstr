# Hint System — контекстные подсказки

## Цель

Помочь новому пользователю ориентироваться в интерфейсе без навязчивого
onboarding wizard. Каждая непонятная секция имеет значок `ⓘ`, который
показывает подсказку при нажатии и автоматически исчезает после того как
пользователь достаточно с ней познакомился.

## Поведение

### Условие исчезновения значка

Значок `ⓘ` исчезает навсегда при выполнении **любого** из условий:

- Пользователь открыл подсказку **1 раз** (кликнул на `ⓘ`)
- Пользователь посетил секцию **3 раза** (даже не открывая подсказку)
- Пользователь нажал крестик «больше не показывать» внутри popover

### Хранение состояния

localStorage, ключ на каждый hint:

```
tutorhub:hint:{hintId} → JSON { views: number, dismissed: boolean }
```

### Визуальное поведение

- Значок `ⓘ` — маленький, ненавязчивый, рядом с заголовком секции
- При клике открывается **popover** — позиционируется рядом со значком,
  работает на мобильном
- Popover закрывается по клику вне него или по кнопке «Понятно»
- Кнопка «Больше не показывать» — скрывает hint навсегда (`dismissed: true`)
- Значок пульсирует / имеет subtle анимацию при первом появлении
  (только для `views === 0`)

## Архитектура

### Новые файлы

```
src/utils/hintStorage.ts
src/hooks/useClickOutside.ts
src/hooks/useHint.ts
src/components/ui/HintIcon.tsx
src/components/ui/HintPopover.tsx
src/locales/{en,ru,uk}/hints.json
```

### `src/utils/hintStorage.ts`

```typescript
export type HintState = { views: number; dismissed: boolean };

const PREFIX = "tutorhub:hint:";

export function getHintState(hintId: string): HintState { ... }
export function saveHintState(hintId: string, state: HintState): void { ... }
```

### `src/utils/useClickOutside.ts`

```typescript
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: () => void
): void;
```

Навешивает `mousedown` + `touchstart` на `document`, проверяет
`!ref.current?.contains(e.target)`.

### `src/hooks/useHint.ts`

```typescript
type UseHintOptions = { maxViews?: number }; // default: 3

type UseHintReturn = {
  isVisible: boolean;  // показывать ли значок ⓘ
  isNew: boolean;      // views === 0 (для анимации пульса)
  markSectionVisit: () => void;
  markOpened: () => void;   // dismiss навсегда
  dismiss: () => void;
};
```

**Логика `isVisible`:**
```
isVisible = !dismissed && views < maxViews
```

- `markSectionVisit` → `views++` (вызывается в `useEffect` при монтировании секции)
- `markOpened` → `dismissed = true` (1 открытие = хватит)
- `dismiss` → `dismissed = true`

### `src/components/ui/HintIcon.tsx`

```typescript
type HintIconProps = {
  hintId: string;
  content: string | ReactNode;
  title?: string;
  maxViews?: number;
};
```

Рендерит:
- если `!isVisible` → `null`
- если `isVisible` → кнопка `ⓘ` + `<HintPopover>`

### `src/components/ui/HintPopover.tsx`

- Позиционируется через CSS `position: absolute` относительно `HintIcon`
  с fallback для выхода за края экрана (мобильный)
- Закрывается по клику вне (`useClickOutside`)
- Содержит: заголовок, текст, кнопка «Понятно», кнопка «Больше не показывать»

## i18n

Новый namespace `hints` во всех трёх языках:

| Ключ | Описание |
|------|----------|
| `hints.gotIt` | Кнопка «Понятно» |
| `hints.dontShow` | Кнопка «Больше не показывать» |
| `hints.{id}.title` | Заголовок поповера |
| `hints.{id}.content` | Текст подсказки |

### Подсказки первой итерации (4 шт.)

| hintId | Секция | Роль | Компонент |
|--------|--------|------|-----------|
| `schedule-slots` | Форма добавления слотов расписания | tutor | `ScheduleForm.tsx` |
| `booking-request` | Входящая заявка на урок | tutor | `RequestsTab.tsx` |
| `nostr-key` | Что такое npub/nsec при авторизации | both | `AuthScreen.tsx` |
| `lesson-status` | Статусы урока (scheduled/completed/canceled) | both | `LessonsTab.tsx` |

Фильтрация по роли — на стороне родительского компонента (условный рендер `HintIcon`).

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `src/i18n/resources.ts` | Импорт `hintsEn`, `hintsUk`, `hintsRu` + добавить в `resources` |
| `src/App.css` | Стили `.hint-icon`, `.hint-popover`, анимация пульса |

## Интеграция в компоненты

### ScheduleForm.tsx

```tsx
// рядом с <h3>{t("schedule.availability")}</h3>
<HintIcon
  hintId="schedule-slots"
  title={t("hints.schedule-slots.title")}
  content={t("hints.schedule-slots.content")}
/>
```

Условие: `role === "tutor"`.

### RequestsTab.tsx

```tsx
// рядом с заголовком incoming-сегмента
{role === "tutor" && (
  <HintIcon
    hintId="booking-request"
    title={t("hints.booking-request.title")}
    content={t("hints.booking-request.content")}
  />
)}
```

### AuthScreen.tsx

```tsx
// рядом с полем ввода/отображения npub/nsec
<HintIcon
  hintId="nostr-key"
  title={t("hints.nostr-key.title")}
  content={t("hints.nostr-key.content")}
/>
```

### LessonsTab.tsx

```tsx
// рядом с заголовком списка уроков
<HintIcon
  hintId="lesson-status"
  title={t("hints.lesson-status.title")}
  content={t("hints.lesson-status.content")}
/>
```

## Что НЕ делает система

- Не показывает подсказки автоматически без действия пользователя
- Не блокирует интерфейс (не modal overlay)
- Не имеет «следующий шаг» / wizard flow
- Не синхронизирует состояние через Nostr
- Не сбрасывает состояние при смене аккаунта (hint привязан к устройству)

## Критерии готовности

- [ ] `hintStorage.ts` с get/save
- [ ] `useClickOutside.ts` — переиспользуемый хук
- [ ] `useHint.ts` с логикой visits + dismiss
- [ ] `HintIcon.tsx` рендерит `null` когда hint просмотрен
- [ ] `HintPopover.tsx` корректно позиционируется на мобильном
- [ ] Кнопка «Больше не показывать» работает
- [ ] Анимация пульса только при `views === 0`
- [ ] i18n namespace `hints` добавлен во все языки (en, ru, uk)
- [ ] 4 секции покрыты hints
- [ ] Нет регрессий в существующих компонентах
