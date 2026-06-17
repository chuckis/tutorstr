# Миграция профилей с `kind:30000` на `kind:0` + NIP-07

## Scope

Объединённый план: перевод профилей с кастомного `kind:30000` на стандартный
Nostr `kind:0` (Metadata) и добавление входа через NIP-07 (Browser Extension).

NIP-46 (Remote Signer) и NIP-98 (HTTP Auth) — отдельные эпики, в этот план
не входят.

---

## Фаза 1 — kind:30000 → kind:0

### 1.1 Сериализация

Добавить `serializeProfile()` в `utils/normalize.ts`:

| Внутреннее поле (UserProfile) | Поле в kind:0 | Статус |
|---|---|---|
| `name` | `name` | NIP-01 standard |
| `bio` | `about` | NIP-01 standard |
| `avatarUrl` | `picture` | NIP-01 standard |
| `subjects` | `subjects` | custom |
| `languages` | `languages` | custom |
| `hourlyRate` | `hourlyRate` | custom |
| `role` | `role` | custom, conditional |
| `availabilityMode` | `availabilityMode` | custom, conditional |
| `timezone` | `timezone` | custom, conditional |
| `workHours` | `workHours` | custom, conditional |

`normalizeProfile()` уже умеет читать оба варианта (`about→bio`,
`picture→avatarUrl`) — изменений не требует.

### 1.2 Tags

Теги остаются без изменений (уже публикуются):

```
["t", "schema:1"]
["t", "role:tutor"] / ["t", "role:student"]
["t", "subject:cs"] (repeat per subject)
["t", "language:en"] (repeat per language)
["t", "mode:remote"] (tutor only)
```

### 1.3 ProfileEventRepository

- `adapters/nostr/profileEventRepository.ts`:
  - subscribe: `addKindListener(30000, ...)` → `addKindListener(0, ...)`
  - publish: `publishReplaceableEvent(30000, ...)` → `publishReplaceableEvent(0, ...)`

### 1.4 Global subscription

- `adapters/nostr/subscriptionManager.ts`:
  - Добавить `kind 0` в `ALL_KINDS`

### 1.5 useTutorProfile

- `hooks/useTutorProfile.ts`:
  - `publishProfile()`: `JSON.stringify(serializeProfile(nextProfile))` вместо
    `JSON.stringify(nextProfile)`

### 1.6 Студенты

- Публикуют `kind 0` с `role:student` (тег и поле content)
- Без `subjects`/`hourlyRate`/`mode` (уже так)
- Не видны в Discover (фильтр `role === "tutor"` в `useTutorDirectory`)

### 1.7 Relay (Khatru)

- `relay/main.go` — изменений не требуется
- `ReplaceEvent` уже подключён, kind:0 — replaceable по NIP-01
- `slicestore.QueryEvents` поддерживает `#t` фильтры
- In-memory store (dev), данные теряются при рестарте

### 1.8 Docs

- `spec.md §4`: роль хранится в vault И публикуется в kind:0 (content + tags).
  Нет отдельного kind 30007.
- `spec.md §4.1`, `§4.2`, `§4.4`: kind 30000 → kind 0
- `spec.md §4.6`: уточнено — роль публикуется в profile event, не в отдельном kind
- `spec.md §6`: таблица kinds — 30000 → 0
- `spec.md §7.1`: полное описание kind 0 схемы
- `nostr-kinds.md`: kind 0 — активный, kind 30000 — deprecated

---

## Фаза 2 — NIP-07 (Browser Extension)

### 2.1 Зависимости

- `nostr-tools/nip07` — типы `WindowNostr` (только типы, без runtime)
- Собственная обёртка в `NostrSigner`

### 2.2 Реализация NIP-07 signer

Новый файл: `adapters/nostr/nip07Signer.ts`

```typescript
import type { WindowNostr } from "nostr-tools/nip07";
import { NostrSigner, SignEventDraft, SignedEvent } from "../../ports/nostrSigner";
import { AuthSession } from "../../domain/auth";

export function createNip07Signer(pubkey: string, npub: string): NostrSigner {
  const nostr = (window as unknown as { nostr?: WindowNostr }).nostr;
  if (!nostr) throw new Error("NIP-07 extension not found");

  let session: AuthSession = { pubkey, npub, role: undefined as any };

  return {
    getSession() { return session; },
    setRole(role: AccountRole) { session = { ...session, role }; },
    async signEvent(draft: SignEventDraft): Promise<SignedEvent> {
      return nostr.signEvent(draft) as Promise<SignedEvent>;
    },
    async encrypt(recipientPubkey: string, plaintext: string) {
      if (!nostr.nip04?.encrypt) throw new Error("nip04 not available");
      return nostr.nip04.encrypt(recipientPubkey, plaintext);
    },
    async decrypt(senderPubkey: string, ciphertext: string) {
      if (!nostr.nip04?.decrypt) return null;
      try {
        return await nostr.nip04.decrypt(senderPubkey, ciphertext);
      } catch { return null; }
    },
  };
}
```

### 2.3 Auth controller — новые режимы

`hooks/useAuthController.ts`:

- **`"nip07-connecting"`** — обнаружение расширения, вызов `getPublicKey()`
- **role discovery** — после получения pubkey:
  1. Подписка на `kind 0` для этого pubkey (таймаут ~3s)
  2. Если найден event с `role` в контенте/тегах → роль resolved
  3. Если нет → показать существующий `"role-pick"` экран
  4. После role-pick → авто-публикация `kind 0` с ролью

### 2.4 AuthScreen — кнопка Extension

- Кнопка "Sign in with Extension" — видна только если `window.nostr` обнаружен
- Состояние "Connecting..." при `nip07-connecting`
- Если расширение не обнаружено — кнопка скрыта, доступны vault-методы

### 2.5 App.tsx — подключение

```typescript
// Рядом с существующим authDeps
function createSigner(session: AuthSession, passphrase: string): NostrSigner {
  return createVaultNostrSigner(session, passphrase);
}
// Для NIP-07 — другая фабрика
function createNip07Signer(pubkey: string, npub: string): NostrSigner {
  return createNip07SignerImpl(pubkey, npub);
}
```

### 2.6 Flow NIP-07 пользователя

```
1. Пользователь нажимает "Sign in with Extension"
2. Расширение (Alby/Nos2x) показывает диалог подтверждения
3. После подтверждения → получаем pubkey
4. Подписка на kind 0 этого pubkey (3s)
   ├─ найден профиль с role → роль resolved → вход в приложение
   └─ не найден/нет role → show role-pick → публикация kind 0 → вход
5. SignerManager.setSigner(nip07Signer)
6. Приложение работает как обычно (профиль, расписание, запросы...)
```

---

## Миграция данных

Не требуется — реальных пользователей нет, старые kind:30000 на dev-реле
теряются при перезапуске (in-memory slicestore).

Скрипт миграции (`scripts/migrate-30000-to-0.ts`) — опционально, если
понадобится перенести prod-данные:

1. Запрос всех `kind: 30000`
2. Маппинг полей + тегов
3. Публикация как `kind: 0`
4. Опционально: `kind: 5` для удаления старых событий

---

## Acceptance Criteria

1. Новые профили публикуются как `kind: 0`, старые `kind: 30000` больше не
   создаются
2. `normalizeProfile` корректно читает оба формата (
   `kind:30000` с `bio`/`avatarUrl` и `kind:0` с `about`/`picture`)
3. Discover показывает только tutor'ов (фильтр по `role: "tutor"`)
4. Student профили публикуются как `kind: 0` с `role: student`, не видны в
   Discover
5. Vault-аутентификация без изменений
6. NIP-07: коннект через расширение → role-discovery → работа с приложением
7. Все 153 теста проходят

---

## Файлы для изменения (Phase 1)

| Файл | Изменение |
|------|-----------|
| `frontend/src/utils/normalize.ts` | + `serializeProfile()` |
| `frontend/src/nostr/kinds.ts` | + `Metadata = 0` |
| `frontend/src/adapters/nostr/profileEventRepository.ts` | kind 30000→0 |
| `frontend/src/adapters/nostr/subscriptionManager.ts` | +0 в ALL_KINDS |
| `frontend/src/hooks/useTutorProfile.ts` | serialize перед publish |
| `frontend/src/domain/auth.ts` | — (role в session уже есть) |
| `docs/spec.md` | kind 30000→0, §4.6, §7.1 |
| `docs/nostr-kinds.md` | kind 0 active, 30000 deprecated |

## Файлы для создания/изменения (Phase 2)

| Файл | Изменение |
|------|-----------|
| `frontend/src/adapters/nostr/nip07Signer.ts` | **NEW** — обёртка WindowNostr |
| `frontend/src/hooks/useAuthController.ts` | + nip07-connecting, role-discovery |
| `frontend/src/components/AuthScreen.tsx` | + extension button, loading |
| `frontend/src/App.tsx` | + nip07 signer factory |
