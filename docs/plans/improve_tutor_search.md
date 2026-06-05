# Улучшение поиска туторов в Discover

## Проблема
Поиск работает только по предметам. Нужны фильтры: предмет, язык, remote/offline/hybrid, доступен сейчас, есть свободные слоты на неделе.

## Архитектурный подход
Следуем принципам Чистой Архитектуры. Доменные селекторы чисты и тестируемы. Хуки — тонкая прослойка React. Компоненты получают данные через пропсы.

---

## 1. Домен — `domain/`

### a. `domain/profile.ts`
- Добавить `AvailabilityMode` и поле `availabilityMode` в `TutorProfile`

### b. `domain/tutorDirectoryQuery.ts` (новый файл)
- Тип `TutorDirectoryQuery` со всеми полями фильтрации

### c. `domain/tutorSelectors.ts` (новый файл)
- Чистые функции-предикаты для каждого измерения фильтрации:
  - `tutorMatchesSubject(profile, filter): boolean`
  - `tutorMatchesLanguage(profile, filter): boolean`
  - `tutorHasLocationMode(profile, mode): boolean`
  - `tutorHasFreeSlotsThisWeek(schedule, pubkey, occupiedKeys): boolean`
  - `tutorIsAvailableNow(schedule, pubkey, occupiedKeys): boolean`

---

## 2. Утилиты — `utils/normalize.ts`

- Добавить `availabilityMode` в `emptyProfile`
- Обновить `normalizeProfile` — читать и валидировать `availabilityMode`

---

## 3. Порты — `ports/` (без изменений)

Новые порты не нужны — фильтрация остаётся клиентской.

---

## 4. Адаптеры — `adapters/nostr/profileEventRepository.ts`

- Добавить тэги при публикации: `["t", "lang:<language>"]` и `["t", "mode:<mode>"]`

---

## 5. Хуки

### `hooks/useTutorDirectory.ts`
- Принять опциональные `schedules` и `winnerByAllocationKey`
- Заменить `subjectFilter: string` на `directoryQuery: TutorDirectoryQuery`
- Использовать доменные селекторы в `useMemo`

### `hooks/useAppController.ts`
- Прокинуть `schedules` и `winnerByAllocationKey` в `useTutorDirectory`
- Прокинуть `directoryQuery` / `setDirectoryQuery` вместо `subjectFilter`

---

## 6. Компоненты

### `components/FilterBar.tsx` (новый)
- Поля: subject, language, locationMode (`<select>`), availableNow (`<checkbox>`), hasFreeSlotsThisWeek (`<checkbox>`)
- Принимает `query: TutorDirectoryQuery` и `onChange`

### `components/DiscoverTab.tsx`
- Заменить `<input>` фильтр на `<FilterBar>`
- Обновить пропсы

### `components/TutorCard.tsx`
- Добавить бейдж availabilityMode (если есть)

### `components/ProfileForm.tsx`
- Добавить `<select>` для availabilityMode (только tutor)

---

## 7. Интернационализация

### `locales/{en,uk,ru}/discover.json`
- Ключи: `languageLabel`, `languagePlaceholder`, `locationModeLabel`, `availableNow`, `freeSlotsThisWeek`, `remote`, `offline`, `hybrid`, `any`

### `locales/{en,uk,ru}/profile.json`
- Ключи: `availabilityMode`, `notSpecified`, `remote`, `offline`, `hybrid`

---

## 8. `App.tsx`
- Обновить пропсы для `DiscoverTab`

---

## Порядок реализации

| Шаг | Файл | Что делать |
|-----|------|-----------|
| 1 | `domain/profile.ts` | Добавить `AvailabilityMode` |
| 2 | `domain/tutorDirectoryQuery.ts` | Создать |
| 3 | `domain/tutorSelectors.ts` | Создать |
| 4 | `utils/normalize.ts` | Обновить |
| 5 | `adapters/nostr/profileEventRepository.ts` | Добавить тэги |
| 6 | `hooks/useTutorDirectory.ts` | Переработать |
| 7 | `hooks/useAppController.ts` | Подключить новые данные |
| 8 | `App.tsx` | Обновить пропсы |
| 9 | `components/FilterBar.tsx` | Создать |
| 10 | `components/DiscoverTab.tsx` | Использовать FilterBar |
| 11 | `components/TutorCard.tsx` | Бейдж |
| 12 | `components/ProfileForm.tsx` | Select для mode |
| 13 | `locales/*/discover.json` | Ключи |
| 14 | `locales/*/profile.json` | Ключи |
| 15 | Проверка | lint + typecheck |

## Что НЕ делаем (сознательно)
- Не добавляем новый Nostr kind для роли
- Не создаём use-case (нет I/O, нет ролевой проверки)
- Не переходим на серверную фильтрацию
- Не меняем порты
