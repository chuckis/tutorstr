# План: разделение ролей Tutor / Student

> Документ для согласования. Не фиксирует реализацию — фиксирует требования,
> точки решений и порядок внедрения.

## 1. Контекст

Сейчас фронтенд (`frontend/`, `src/`) работает в одной роли — Tutor: профиль
с тарифом и предметами, публикация слот-расписания (`kind 30001`), приём и
отклонение запросов. «Студент» в коде присутствует только как имя параметра
(`studentPubkey`, `studentNpub`) — никаких отдельных экранов, форм или
прав у него нет.

Бизнес-логика MVP требует, чтобы `npub` однозначно относился либо к роли
**Tutor**, либо к роли **Student**, и UI/домен это учитывал.

## 2. Цели

- Роль выбирается один раз при регистрации и хранится вместе с аккаунтом.
- `npub` имеет ровно одну роль в MVP (мульти-роль — out of scope, см. §11).
- UI, навигация и доменные правила зависят от роли текущего пользователя.
- Доменные use-cases (booking, lesson, messaging) не меняют публичную
  логику — только фильтруют действия по роли.
- Все решения остаются в парадигме `domain/ → ports/ → application/ → adapters/ → hooks/ → components/`
  (см. `docs/plans/todo/task_architecture_audit.md`).

## 3. Не-цели (out of scope)

- Переключение роли для существующего `npub` (только пересоздание аккаунта).
- Один `npub` = две роли одновременно.
- Верификация роли «с другой стороны» (т.е. доверие к чужому `kind 30000`).
- Онбординг туторов-студентов и связанные UX-сценарии.
- Изменения релейной части (`relay/`) — там пока заглушки.

## 4. Модель ролей

### 4.1 Домен

```ts
// domain/account.ts (новый файл, без зависимостей)
export type AccountRole = "tutor" | "student";

export const ACCOUNT_ROLES: readonly AccountRole[] = ["tutor", "student"] as const;

export class UnsupportedAccountRoleError extends Error {
  constructor(value: string) {
    super(`Unsupported account role: ${value}`);
  }
}
```

### 4.2 Хранение роли — согласовано

**Выбор: A. Только vault (локально).**

Роль хранится в `VaultRecord` рядом с `pubkey`/`npub` и является
источником истины для собственного UI. Никаких новых Nostr kinds
(`30007` Account) в MVP не вводится. См. также §11.8.

Последствия:
- Другой клиент, импортирующий тот же `nsec` в «чистый» vault, не
  узнает роль до онбординга-восстановления (вне MVP). В рамках MVP
  legacy-import получает `role="tutor"` — см. §10.2.
- Релейная индексация по ролям в этом плане не делается.

## 5. Онбординг и регистрация

### 5.1 Текущий флоу (`AuthScreen.tsx`)

```
welcome → choice → create | import → master password → nsec показ → app
```

### 5.2 Целевой флоу

```
welcome → choice → create | import → master password → role pick → nsec показ → app
                                                       └─ (только create)
```

Шаги:

1. **Существующее** (`AuthScreen.tsx`): welcome / create / import / unlock.
2. **Новый шаг `role-pick`** появляется только после `create`:
   - два radio-карточки: «Я тутор» / «Я студент»;
   - текст-подсказка с краткой разницей (см. §7);
   - кнопка «Продолжить» активна только после выбора;
   - **import-поток роль не спрашивает**: роль берётся из vault
     (если vault без роли — fallback на §10.2).
3. После выбора роли — стандартный показ `nsec` и подтверждение бэкапа.
4. Импортирующий пользователь без роли (legacy) проходит
   `RoleRecoveryScreen` — см. §10.2.

### 5.3 Поверхности, которые меняются

- `components/AuthScreen.tsx` — добавляется шаг `role-pick`.
- `hooks/useAuthController.ts` — `AuthMode = ... | "role-pick"`,
  передача `role` в `createNewProfile`.
- `application/auth/createNewProfile.ts` — добавить `role` в возвращаемый
  `AuthSession` (и/или отдельно в `VaultRecord`).
- `domain/auth.ts` — расширить `AuthSession` / `VaultRecord` полем `role`,
  добавить `validateRole()`.
- `i18n/locales/{en,ru,uk}/auth.json` — новые ключи `auth.rolePick.*`.

## 6. Хранение роли

### 6.1 Vault (источник истины)

```ts
// domain/auth.ts
export type VaultRecord = {
  version: number;            // поднять до 2
  role: AccountRole;          // новое поле
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  kdfIterations: number;
  pubkey: string;
  npub: string;
};
```

Миграция `version: 1 → 2`: при чтении из vault отсутствующее `role`
обрабатывается по §10.

### 6.2 Чтение роли

Источник истины — **только vault**. Никаких `kind 30007` или
kind-0-метаданных в MVP не публикуется и не читается для определения
собственной роли.

## 7. UX-правила по ролям

### 7.1 Permission matrix

| Действие | Tutor | Student | Где живёт правило |
|---|---|---|---|
| Опубликовать профиль (`kind 30000`) | ✅ | ⚠️ read-only-поля (см. §7.3) | `application/usecases/publishTutorProfile.ts` + новая гард-функция `assertCanPublishTutorProfile(role)` |
| Опубликовать расписание (`kind 30001`) | ✅ | ❌ | новый use-case `publishTutorSchedule.ts`, гард `assertCanPublishSchedule(role)` |
| Принять/отклонить booking (`kind 30003`) | ✅ | ❌ | `acceptBooking.ts`, гард |
| Создать booking-запрос (`kind 30002`) | ❌ (гард) | ✅ | новый use-case `createBookingRequest.ts`, гард `assertRole("student")` |
| Отменить booking (`kind 30003`, status=cancelled) | ✅ | ✅ | `cancelRequestFromStudent.ts` уже есть, гард для роли tutor |
| Завершить lesson (`kind 30006` status=completed) | ✅ | ❌ | `changeLessonStatus.ts`, гард |
| Писать progress (`kind 30004`) | ✅ | ✅ | без изменений |
| Отправить DM (`kind 4`) | ✅ | ✅ | без изменений |
| Видеть вкладку Discover | ✅ (только туторы) | ✅ (только туторы) | фильтр `useTutorDirectory.ts` |
| Видеть «Incoming» в Requests | ✅ | ❌ (только «Outgoing») | `useAppNavigation.ts` + `RequestsTab.tsx` |
| Редактировать тариф/предметы в профиле | ✅ | ❌ (read-only-скрыто) | `ProfileForm.tsx` пропс `mode: "tutor" \| "student"` |
| Видеть ScheduleForm | ✅ | ❌ (секция скрыта) | `DashboardTab.tsx` |

### 7.2 Дисковер для Тутора

Текущая семантика: в `DiscoverTab` показываются все `TutorProfileEvent`
(фильтр `kind 30000` + `t role:tutor`). Студенты в дисковере не показываются
(у них нет `kind 30000`).

После введения ролей правило прежнее, но формализуется:
- `useTutorDirectory.ts` подписывается только на `kind 30000`.
- Если в будущем появится «лёгкий профиль» студента, фильтр уже
  корректен — он идёт по kind.
- Никаких изменений в `DiscoverTab.tsx` не требуется, но:
  - в `useAppController.ts` для роли tutor отключаем CTA
    `requestBooking`/`requestPublishedSlot` (см. §11 — out of scope,
    но точку действия фиксируем).

### 7.3 Профиль Студента (упрощённый)

`ProfileForm` (`components/ProfileForm.tsx`) — **один компонент** с
пропсом `mode: "tutor" | "student"` (согласовано в §11.3).
Режим `mode="student"` рендерит только:

- `name` — да
- `bio` — да
- `avatarUrl` — да
- `languages` — да (опционально, для подбора туторов)
- `subjects` — **скрыто**
- `hourlyRate` — **скрыто**

Студент публикует `kind 30000` с частично пустыми полями — допустимо,
схема не требует заполнения всех ключей. Переиспользуем `kind 30000`,
не вводим новый `StudentProfile`-kind.

`DashboardSettingsDrawer.tsx` пробрасывает `role` в `ProfileForm`
(внутри `ProfileForm` сам маппит `role → mode`).

### 7.4 Dashboard-вкладка (Profile)

`DashboardTab` — **один компонент** с пропсом `mode: "tutor" | "student"`
(согласовано в §11.4).

- **Tutor** — текущий вид: bio, subjects, rate, schedule, статусы
  публикации, метрики.
- **Student** — упрощённый:
  - bio
  - статусы «профиль опубликован» / «последний апдейт»
  - блок «Мои предстоящие уроки» (кратко, до 3 карточек из `lessonsState`)
  - **без** ScheduleForm, **без** метрик subjects/rate/slots.

### 7.5 Requests-вкладка

- **Tutor** — `incoming` + `outgoing` сегменты (как сейчас).
- **Student** — **только `outgoing`**. Согласовано в §11.5 — сегмент
  `incoming` не рендерится вообще (никаких `disabled`-кнопок):
  - `RequestsTab.tsx` для `role="student"` не рендерит `<div className="segmented">`;
  - `useAppNavigation.ts` для `role="student"` принудительно
    `requestSegment = "outgoing"` (для инвариантности состояния);
  - `useRequestsTabViewModel.ts` уже умеет строить `outgoingRequests`
    — нужно просто не передавать `incoming` для роли student.

### 7.6 Lessons-вкладка

Без изменений в логике: и у тутора, и у студента есть список уроков
(`useLessons`). У тутора остаётся кнопка «Complete», у студента — нет
(гард в `changeLessonStatus.ts`).

### 7.7 BottomNav (навигация)

- 4 таба остаются (`discover`, `requests`, `lessons`, `profile`).
- Подсчёт unread:
  - `requestsUnreadCount` для student = `outgoing`-unread
    (текущий `messageIndicators.requestUnreadCount` уже считает по всем
    — нужно отфильтровать `outgoing`-only для роли student).
  - Это изменение в `useMessageIndicators.ts` / `useAppViewModel.ts`.

### 7.8 DM на Discover (формализация §11.7)

Сейчас блок сообщений в `DiscoverTab.tsx:154-163` закомментирован с
пометкой «только от тутора». Поведение после ролей:

- **`role="student"`** — обычный чат (read+write) с выбранным тутором
  (DM через `kind 4` NIP-04). Рендерим `<MessageThread>` +
  `<MessageComposer>`.
- **`role="tutor"`** — read-only блок «анонсов» от выбранного тутора
  (если тот опубликовал что-то в `kind 30005` TutorBlogPost). Без
  `<MessageComposer>`. Если анонсов нет — секция не рендерится.

Источник данных для tutor-анонсов — будущая подписка на `kind 30005`
от `selectedTutor.pubkey`. В этом плане достаточно зафиксировать
рендер-правило; саму подписку делаем отдельной задачей вне фаз §12
(можно в той же Фазе 4, если объём подписки тривиален).

## 8. Доменные use-cases, которые меняются

Минимальный набор правок (все в `application/`, без зависимостей от Nostr/React):

| Use-case | Изменение | Гард |
|---|---|---|
| `auth/createNewProfile.ts` | принять `role`, записать в `VaultRecord` | — |
| `auth/restoreStoredSession.ts` | читать `role`, мигрировать v1→v2 | — |
| `auth/importExistingKey.ts` | если vault без роли — бросить `MissingRoleError` | — |
| **новый** `account/assertRole.ts` | чистая функция `assertRole(actual, expected)` | переиспользуется во всех гардах |
| `usecases/acceptBooking.ts` | `assertRole(viewer, "tutor")` перед публикацией `kind 30003 accepted` | да |
| `usecases/cancelRequestFromStudent.ts` | разрешено обеим ролям, но ветка «tutor cancels accepted lesson» отдельно | частично |
| `usecases/changeLessonStatus.ts` | `assertRole(viewer, "tutor")` для `completed`/`cancelled` (tutor-only) | да |
| **новый** `usecases/publishTutorSchedule.ts` (если ещё не выделен) | `assertRole(viewer, "tutor")` | да |
| **новый** `usecases/createBookingRequest.ts` | `assertRole(viewer, "student")` | да |

## 9. Hooks и контроллеры

- `hooks/useAuthController.ts`:
  - хранит `role: AccountRole | null` (после unlock/import);
  - `useEffect` при unlock восстанавливает роль;
  - новый шаг онбординга пробрасывает роль в use-case.
- `hooks/useAppController.ts`:
  - пробрасывает `role` во все зависящие хуки;
  - условно вызывает `useTutorProfile` / новый `useStudentProfile`;
  - для `student` не вызывает `useTutorSchedule`, `useBookings.incoming`
    (создаёт пустые массивы).
- `hooks/useTutorProfile.ts` / `useTutorSchedule.ts` — оставляем как есть,
  но `useTutorSchedule` для student возвращает пустое расписание.
- **новый** `hooks/useStudentProfile.ts` (опционально) — тонкая обёртка
  для упрощённого `ProfileForm`. Можно переиспользовать `useTutorProfile`
  с фильтрованными полями — на согласование, см. §12.

## 10. Миграция существующих данных

### 10.1 Поле `role` в vault

При `restoreStoredSession` (`application/auth/restoreStoredSession.ts`):

```ts
if (!record.role) {
  // legacy v1: роль = "tutor" (все существующие аккаунты — туторы,
  // т.к. student-flow ещё не существовал)
  record.role = "tutor";
  // опционально: поднять version до 2
}
```

Это **безопасный default**: в кодовой базе нет ни одного сценария, в
котором legacy-`npub` был бы студентом — студентского флоу просто не было.

### 10.2 Импорт ключа без роли

Сценарий: пользователь импортирует `nsec`, у которого в `localStorage`
vault-а нет (новый браузер / новый девайс). Такой ключ автоматически
становится `tutor` (§10.1) — это согласуется с текущей моделью
«импорт = восстановление доступа к существующему профилю».

Если позже потребуется восстановление роли студента — расширять через
отдельный онбординг «восстановление профиля», не в MVP.

### 10.3 Публикация роли в Nostr

Не делается. Согласовано (§4.2, §11.8) — роль хранится только в vault,
внешний Nostr-канал не используется.

## 11. Согласованные решения

| # | Вопрос | Решение |
|---|---|---|
| §4.2 | Хранение роли | **A: только vault.** Никаких `kind 30007` / kind-0 в MVP. |
| §11.2 | Tutor → tutor booking | **Запрещено.** `createBookingRequest.ts` имеет гард `assertRole("student")`. |
| §11.3 | ProfileForm | **Один компонент** с пропсом `mode: "tutor" \| "student"`. |
| §11.4 | DashboardTab | **Один компонент** с пропсом `mode: "tutor" \| "student"`. |
| §11.5 | Requests incoming для Student | **Скрыть контрол полностью.** Никаких `disabled`-кнопок. |
| §11.6 | Локализация ролей | **Новый `account.json`** (3 языка). Ключи: `account.roles.*`, `account.roleDescription.*`, `account.rolePick.*`. |
| §11.7 | DM на Discover | **Student — чат с тутором; tutor — read-only анонсы** (от `kind 30005`, см. §7.8). |
| §11.8 | Nostr-спек `kind 30007` | **Не делаем.** Снимается автоматически выбором §4.2 = A. |

Не-вопросы (зафиксированы как принципы, не требуют согласования):

- `npub → role` = `1:1` в MVP. Мульти-роль — отдельный план в будущем.
- Релейная индексация по ролям — вне этого плана.
- Верификация роли контрагента — вне этого плана.

## 12. Фазы внедрения

Фазы упорядочены так, чтобы в каждой можно было выпустить промежуточный
релиз без поломки текущего tutor-only поведения.

### Фаза 0 — согласование

- [x] Получить ответы на §11 (см. таблицу согласованных решений).
- [x] Утвердить вариант хранения роли — A (только vault).

### Фаза 1 — домен и аутентификация (без UI-видимых изменений)

- [ ] `domain/account.ts` — `AccountRole`, ошибки.
- [ ] `domain/auth.ts` — `VaultRecord.role`, `version: 2`,
      миграция в `restoreStoredSession`.
- [ ] `application/auth/createNewProfile.ts` — параметр `role`.
- [ ] `application/auth/importExistingKey.ts` — бросает
      `MissingRoleError` (на этом этапе никто не ловит — ОК).
- [ ] `application/account/assertRole.ts` — чистая функция.
- [ ] Unit-тесты: миграция vault, `assertRole`, `createNewProfile` с
      обеими ролями.
- [ ] Локализация: новый `account.json` (3 языка) с ключами
      `account.rolePick.*`, `account.roles.tutor`,
      `account.roles.student`, `account.roleDescription.tutor`,
      `account.roleDescription.student`.

**Проверка фазы**: существующий tutor-only флоу проходит автотесты
без изменений; legacy vault читается и получает `role="tutor"`.

### Фаза 2 — UI онбординга (видимое нововведение)

- [ ] `useAuthController.ts` — `AuthMode = ... | "role-pick"`,
      новый `actions.chooseRole(role)`.
- [ ] `AuthScreen.tsx` — шаг `role-pick` (только после `create`).
- [ ] Импорт — без шага `role-pick`, роль берётся из vault.
- [ ] Unlock — без изменений.
- [ ] Юнит-тест `useAuthController` (или e2e Playwright, если есть).

**Проверка фазы**: новый пользователь видит выбор роли; импорт
продолжает работать; старые vault-ы мигрируют в `tutor` без
перерегистрации.

### Фаза 3 — гарды в use-cases

- [ ] `acceptBooking.ts` — `assertRole(viewer, "tutor")`.
- [ ] `changeLessonStatus.ts` — гард для `completed`/`cancelled`.
- [ ] **новый** `createBookingRequest.ts` — `assertRole(viewer, "student")`.
- [ ] `cancelRequestFromStudent.ts` — гард, что `tutor` отменяет
      только `accepted`, `student` — только `pending`.
- [ ] **новый** `publishTutorSchedule.ts` (выделить из `useTutorSchedule.ts`,
      если ещё не выделен) — `assertRole(viewer, "tutor")`.
- [ ] Unit-тесты на каждый use-case с обеими ролями.

**Проверка фазы**: `npm test` зелёный; тесты покрывают «запрещено
для роли» для каждого use-case.

### Фаза 4 — UI-фильтрация по роли

- [ ] `useAppController.ts` — пробрасывает `role` в зависимые хуки;
      для `student` отключает `useTutorSchedule`,
      фильтрует `bookingsState.incoming` в пустой массив.
- [ ] `useAppNavigation.ts` — `requestSegment` для `student` всегда
      `"outgoing"`.
- [ ] `useMessageIndicators.ts` — для `student` считает unread только
      по `outgoing` thread-ключам.
- [ ] `RequestsTab.tsx` — сегмент `incoming` **не рендерится** для `student`
      (никаких `disabled`-кнопок).
- [ ] `ProfileForm.tsx` — пропс `mode: "tutor" | "student"`, режим
      `student` без `subjects`, `hourlyRate`.
- [ ] `DashboardSettingsDrawer.tsx` — пробрасывает `role` в `ProfileForm`.
- [ ] `DashboardTab.tsx` — пропс `mode: "tutor" | "student"`,
      `student`-вариант без `ScheduleForm`/метрик.
- [ ] `DiscoverTab.tsx` — формализовать блок сообщений по §7.8:
      student — чат с тутором, tutor — read-only анонсы.
- [ ] Локализация: ключи `profile.student.*`,
      `requests.student.incomingHidden`, `discover.studentChat`,
      `discover.tutorAnnouncements`.

**Проверка фазы**: e2e «я создал student-аккаунт → не вижу schedule
form → не вижу incoming → не могу опубликовать слот» — проходит.

### Фаза 5 — документация и снятие долга

- [ ] `docs/spec.md` — обновить §4 «User Roles» под новую модель.
- [ ] `AGENTS.md` — отметить, что роли обязательны в новых use-case.
- [ ] CHANGELOG / release notes (если ведётся).

## 13. Риски

| Риск | Митигация |
|---|---|
| Импорт ключа от студента, чей vault был создан на другом клиенте — роль потеряется | Fallback `tutor` (см. §10.2); онбординг-восстановление роли — отдельная задача вне MVP. В MVP это безопасно, т.к. студент-флоу ещё не существует в production. |
| Существующие автотесты на tutor-only UI сломаются | Фазы 1–3 — без UI-изменений, тесты остаются зелёными; UI-тесты обновляем в Фазе 4 |
| Случайный сценарий «tutor запрашивает урок сам у себя» | Гард в `createBookingRequest.ts` (`assertRole("student")`) закрывает; решение зафиксировано в §11.2 |
| Публикация `kind 30000` студентом ломает дисковер-фильтр | Дисковер фильтрует по `kind`, а не по роли (см. §7.2) — не ломается; доп. проверка: добавить в Фазе 4 e2e «student-профиль не появляется в Discover у других» |
| Рост объёма локалей (3 языка × новые ключи) | Ключи минимальны и переиспользуются; переводы — в одном коммите с кодом |

## 14. Что НЕ входит в этот план

- Relay-сервер, индексация ролей на релее.
- Верификация роли контрагента.
- Репутация / рейтинг / арбитраж.
- Платежи.
- Multi-role (`1:N`).
- Публикация роли в Nostr (`kind 30007` и любые другие каналы).
- Подписка на `kind 30005` для анонсов туторов (только рендер-правило
  в §7.8 — сама подписка — отдельная задача).

---

**Согласование**: §11 закрыт (см. таблицу согласованных решений).
Документ готов к выделению фаз в issue-трекере.
