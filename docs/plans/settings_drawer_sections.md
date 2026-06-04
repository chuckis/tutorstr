# План: секционная шухляда настроек (DashboardSettingsDrawer)

## Суть

Шухляда перестаёт быть плоским скроллом всех блоков сразу. Вместо этого
появляется **главное меню** (список секций), а каждая секция — отдельный
"экран" внутри шухляды с кнопкой "назад". Паттерн как в Telegram / iOS
Settings.

## Изменения только в слое Components (+ i18n)

Никаких новых use-case'ов, портов, адаптеров или доменных типов. FAQ и About
— статический контент. Settings и Profile — перегруппировка существующего
функционала. Это соответствует Clean Architecture: нижние слои не трогаем.

## Секции

| Раздел | Содержание | Тип |
|--------|-----------|-----|
| **Profile** | Identity card + Avatar upload + ProfileForm + Publish | существующее |
| **Settings** | Blossom URL + RelayConfig (язык, relays) + Session (nsec reveal, logout) | существующее, перегруппировано |
| **FAQ** | Q&A accordion | новый, статический |
| **About** | appName, version, description, Nostr ссылка | новый, статический |

## Поток навигации внутри шухляды

```
DashboardSettingsDrawer (isOpen=true)
  │
  ├─ activeSection === "menu"
  │   ┌─────────────────────┐
  │   │  Settings        ×  │  header
  │   ├─────────────────────┤
  │   │ ⚙️  Settings     ›  │
  │   │ 👤  Profile      ›  │
  │   │ ❓  FAQ          ›  │
  │   │ ℹ️  About        ›  │
  │   └─────────────────────┘
  │
  ├─ activeSection === "profile"
  │   ┌─────────────────────┐
  │   │ ← Profile       ×   │  header
  │   ├─────────────────────┤
  │   │  [Identity Card]    │
  │   │  [ProfileForm]      │  существующие компоненты
  │   └─────────────────────┘
  │
  ├─ activeSection === "settings"
  │   ┌─────────────────────┐
  │   │ ← Settings      ×   │  header
  │   ├─────────────────────┤
  │   │  [Blossom URL]      │
  │   │  [RelayConfig]      │  существующие компоненты
  │   │  [Session panel]    │
  │   └─────────────────────┘
  │
  ├─ activeSection === "faq"
  │   ┌─────────────────────┐
  │   │ ← FAQ           ×   │  header
  │   ├─────────────────────┤
  │   │  [Q&A list]         │  SettingsFAQ
  │   └─────────────────────┘
  │
  └─ activeSection === "about"
      ┌─────────────────────┐
      │ ← About         ×   │  header
      ├─────────────────────┤
      │  [App info]         │  SettingsAbout
      └─────────────────────┘
```

## Шаги реализации

1. **i18n ключи** — `profile.json`: секция `drawer` (settings/profile/faq/about
   title), секция `faq` (массив Q&A), секция `about` (app info). Все 3 языка
   (en, ru, uk).

2. **Компонент `SettingsFAQ.tsx`** — pure presentational. Статический список
   вопросов-ответов. Использует `useI18n()`.

3. **Компонент `SettingsAbout.tsx`** — pure presentational. Информация о
   приложении. Использует `useI18n()`.

4. **Модификация `DashboardSettingsDrawer.tsx`**:
   - `useState<DrawerSection>("menu")`
   - Главное меню: список кликабельных строк с иконками и шевроном
   - Условный рендеринг содержимого по `activeSection`
   - Header с кнопкой "назад" в sub-section режиме

5. **CSS стили** — `.settings-menu-list`, `.settings-menu-item`,
   `.settings-back-button`, `.settings-article` и сопутствующие.

## Пропсы компонента

Пропсы `DashboardSettingsDrawer` остаются без изменений. Все данные,
необходимые для Profile и Settings секций, уже передаются через
существующие пропсы. FAQ и About не требуют пропсов.
