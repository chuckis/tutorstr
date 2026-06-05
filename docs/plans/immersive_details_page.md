# Immersive Details Page — `DetailPageLayout`

## Проблема

Три экрана деталей (tutor в Discover, request в Requests, lesson в Lessons) встроены инлайн в свои табы с дублированным паттерном: каждая сама рендерит кнопку «Назад» внутри `.panel.details-screen`. Нет единого компонента лэйаута, и главный хедер (`topbar`) не скрывается на деталях.

## Цель

Создать единый шаблон `DetailPageLayout`, который:
- скрывает главный хедер при открытии детали (immersive)
- показывает sticky top bar с кнопкой «Назад», опциональным заголовком и действиями
- контент скроллится независимо под закреплённой панелью
- используется всеми существующими и будущими экранами деталей

## План реализации

### Шаг 1: `DetailPageLayout.tsx` — новый shared-компонент

Файл: `frontend/src/components/DetailPageLayout.tsx`

```tsx
type DetailPageLayoutProps = {
  backLabel: string;
  onBack: () => void;
  title?: string;
  children: React.ReactNode;
  rightActions?: React.ReactNode;
};
```

Структура:
```
<div className="detail-page">
  <header className="detail-topbar">    — sticky
    <button ghost onClick={onBack}>
      <ArrowLeft /> {backLabel}
    </button>
    {title && <h2 className="detail-title">{title}</h2>}
    {rightActions && <div>{rightActions}</div>}
  </header>
  <div className="detail-content">      — scrollable, flex:1
    {children}
  </div>
</div>
```

### Шаг 2: CSS для `DetailPageLayout`

Добавить в `App.css`:
- `.detail-page` — display: flex; flex-direction: column; height: 100%;
- `.detail-topbar` — position: sticky; top: 0; z-index: 5; display: flex; align-items: center; background: var(--color-bg);
- `.detail-title` — flex: 1; text-align: center;
- `.detail-content` — flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-3);

### Шаг 3: `App.tsx` — скрыть `topbar` на деталях

```tsx
const detailActive = navigation.selectedTutor !== null
  || navigation.selectedRequest !== null
  || navigation.selectedLesson !== null;
```

Условный рендер `.topbar`: `{!detailActive && <header className="topbar">...</header>}`

### Шаг 4: Рефакторинг `DiscoverTab.tsx` (tutor detail)

Заменить обёртку с `<button ghost>Back</button>` + `<div className="stack">` на `<DetailPageLayout>`.

### Шаг 5: Рефакторинг `RequestsTab.tsx` (`RequestDetailsView`)

Заменить `<article className="panel details-screen">` + кнопку назад + `<h2>` на `<DetailPageLayout>`.

### Шаг 6: Рефакторинг `LessonsTab.tsx` (lesson detail)

Заменить `<article className="panel details-screen">` + кнопку назад + `<h2>` на `<DetailPageLayout>`.

### Шаг 7 (опционально): `useAppNavigation.ts` — добавить `detailActive`

Computed-поле: `detailActive = selectedTutor !== null || selectedRequest !== null || selectedLesson !== null`

### Шаг 8: Очистка

- Удалить `.details-screen` из разметки (семантический класс без своих стилей)
- Удалить мёртвый `TutorProfileView.tsx` (не используется)

## Что не меняется

- Логика табов и сегментов
- Пропсы компонентов (кроме удаления ненужных обёрток)
- BottomNav остаётся видимым всегда
- Ролевая логика (`isStudent`) остаётся внутри контента
