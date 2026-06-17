# Модуль авторизации и подписания Nostr-событий в Android PWA (Гибридный подход)

## Статус (June 2026)

План реализуется поверх существующего vault-синьера (локальный nsec,
AES-256-GCM + PBKDF2). На момент написания плана vault-синьер полностью
работоспособен, NIP-07 реализован частично (без персистентности сессии),
NIP-55 и NIP-46 отсутствуют полностью.

---

## Блок 1: Детектор платформы

**Файл:** `frontend/src/adapters/env/platformDetector.ts`

Экспортирует единственный объект `PlatformInfo` с полями:

```ts
type Platform = "mobile" | "desktop";

type PlatformInfo = {
  /** "mobile" для Android PWA, "desktop" для всего остального */
  platform: Platform;
  /** Наличие window.nostr (NIP-07) */
  nip07Available: boolean;
  /** Уточнение: запущено как standalone PWA */
  isStandalone: boolean;
};
```

Логика определения:
- `isStandalone` ← `matchMedia('(display-mode: standalone)').matches`
- `isAndroid` ← `/android/i.test(navigator.userAgent)`
- `platform = isAndroid && isStandalone ? "mobile" : "desktop"`
- `nip07Available ← typeof window.nostr !== "undefined"`

**Зависимости:** только на уровне окружения, чистые функции.

---

## Блок 2: NIP-55 (Android Intents / Amber / Nowser)

### 2.1 Адаптер `frontend/src/adapters/nostr/nip55Signer.ts`

Реализует `NostrSigner` (из `ports/nostrSigner.ts`):

```ts
export class Nip55Signer implements NostrSigner {
  private session: { pubkey: string; npub: string } | null = null;

  constructor(private readonly callbackUrl: string) {}

  async getSession(): Promise<{ pubkey: string; npub: string } | null> {
    return this.session;
  }

  async requestPublicKey(): Promise<string> {
    // Генерирует intent: nostrsigner:?type=get_public_key&callbackUrl=...
    // Переходит по window.location.href
    // Возвращает промис, который резолвится через useNip55Callback
  }

  async signEvent(event): Promise<SignedEvent> {
    // Аналогично: intent → sign_event → callback
  }

  async encrypt(pubkey, plaintext): Promise<string> { /* throw */ }
  async decrypt(pubkey, ciphertext): Promise<string> { /* throw */ }
}
```

**Важно:** NIP-55 на данный момент не поддерживает шифрование/дешифрование
(NIP-04/44) через intents — методы `encrypt`/`decrypt` бросают ошибку,
если вызваны. При необходимости Amber/Nowser пользователь использует
NIP-46 или vault.

### 2.2 Хук `frontend/src/hooks/useNip55Callback.ts`

- Парсит `window.location.search` при загрузке:
  - `pubkey` → завершает `requestPublicKey()`
  - `event` + `signature` → завершает `signEvent()`
  - `error` → реджектит промис с ошибкой
- После обработки чистит URL (`history.replaceState`)
- Возвращает `pendingRequest` для показа лоадера

### 2.3 Цепочка вызова

1. `useAuthController` вызывает `nip55Signer.requestPublicKey()`
2. Браузер уходит в Amber/Nowser
3. Пользователь аппрувит → возврат на PWA через `callbackUrl`
4. `useNip55Callback` ловит параметры → резолвит промис
5. `useAuthController` получает pubkey → устанавливает синьер через
   `SignerManager`

### 2.4 Обработка отказа

Если пользователь отклонил запрос в Amber, Android возвращает `error`
параметр. Хук парсит его, реджектит промис, `useAuthController` ловит
ошибку и возвращает `AuthScreen` в исходное состояние (режим `welcome`).

---

## Блок 3: NIP-46 (Remote Signer / Bunker)

### 3.1 Адаптер `frontend/src/adapters/nostr/nip46Signer.ts`

Реализует `NostrSigner`. Ключевые части:

```ts
export class Nip46Signer implements NostrSigner {
  private session: { pubkey: string; npub: string } | null = null;
  private clientSecret: Uint8Array;      // эфемерный ключ клиента
  private clientPubkey: string;
  private bunkerPubkey: string;
  private relayUrl: string;
  private pool: SimplePool;

  constructor(bunkerUri: string) { /* парсинг */ }

  async connect(): Promise<string> {
    // 1. Генерация эфемерного ключа (generateSecretKey)
    // 2. Парсинг bunker://<pubkey>?relay=<relay>
    //    или NIP-05 → well-known → bunker URL
    // 3. Подписка на реле для получения ответов
    // 4. Отправка зашифрованного JSON-RPC "connect"
    // 5. Ожидание ответа с таймаутом 30с
    // 6. Сохранение pubkey пользователя
  }

  async signEvent(event): Promise<SignedEvent> {
    // 1. Шифрование JSON-RPC "sign_event" с event-json
    // 2. Публикация kind:24133 на реле
    // 3. Ожидание ответа (подписанного event)
  }
}
```

### 3.2 Сессионная персистентность

В localStorage сохраняется:

```ts
type Nip46PersistedSession = {
  method: "nip46";
  clientSecretHex: string;
  clientPubkey: string;
  bunkerPubkey: string;
  relayUrl: string;
  pubkey: string;
  npub: string;
  role: AccountRole;
};
```

При перезагрузке:
1. `restoreStoredSession()` находит `Nip46PersistedSession`
2. Восстанавливает `Nip46Signer` с тем же `clientSecret`
3. Переподключается к реле в фоне (без повторного `connect`)
4. Если переподключение не удалось → ошибка, пользователь видит Welcome

### 3.3 Таймаут

- `connect`: 30с таймаут → `throw new AuthError("Бункер не ответил")`
- `signEvent`: 30с таймаут → `throw new AuthError("Бункер не подписал событие")`

### 3.4 Парсинг ввода

Функция `frontend/src/application/auth/parseBunkerInput.ts`:

```ts
type BunkerInput = { type: "nip05"; address: string } | { type: "bunker"; pubkey: string; relay: string };

function parseBunkerInput(input: string): BunkerInput {
  // Проверка на bunker://<pubkey>?relay=<relay>
  // Или NIP-05 email-подобный формат
}
```

Валидация: кнопка отправки заблокирована, если строка не проходит ни один
из форматов. Inline-ошибка с пояснением.

---

## Блок 4: NIP-07 — персистентность сессии

### 4.1 Расширение `AuthSession`

```ts
// domain/auth.ts
type AuthMethod = "vault" | "nip07" | "nip46" | "nip55";

type AuthSession = {
  pubkey: string;
  npub: string;
  role: AccountRole;
  method: AuthMethod;
};
```

### 4.2 Сохранение NIP-07 сессии

При успешном `window.nostr.getPublicKey()` + role discovery:

```ts
// application/auth/saveNip07Session.ts
function saveNip07Session(pubkey: string, role: AccountRole): void {
  const session: AuthSession = {
    pubkey,
    npub: npubEncode(hexToBytes(pubkey)),
    role,
    method: "nip07",
  };
  localStorage.setItem("tutorhub:auth-session", JSON.stringify(session));
}
```

### 4.3 Восстановление

`restoreStoredSession()` (application/auth/restoreStoredSession.ts):

```ts
// Если vault есть — существующая логика (unlock)
// Если vault пуст, но есть auth-session с method === "nip07":
//   возвращаем AuthSession, устанавливаем signer = новый Nip07Signer()
//   (без повторного connect — window.nostr уже есть)
```

### 4.4 Очистка при logout

`logout.ts` чистит и vault, и `tutorhub:auth-session`.

---

## Блок 5: AuthScreen — реструктуризация под платформу

### 5.1 Проп `platform`

`AuthScreen` получает проп:

```ts
type AuthScreenProps = {
  platform: "mobile" | "desktop";
  // ... остальные пропсы
};
```

Значение вычисляется в `App.tsx` через `platformDetector` и передаётся
через `useAppController`.

### 5.2 Mobile layout

```
┌──────────────────────────┐
│     [Hero / Logo]        │
│                          │
│  ╔══════════════════════╗│
│  ║ Войти через Amber   ║│  ← variant="primary", полная ширина
│  ║ или Nowser (NIP-55) ║│
│  ╚══════════════════════╝│
│                          │
│       ─── или ───        │
│                          │
│  ┌──────────────────────┐│
│  │ Nostr Address или    ││  ← инпут + кнопка "Подключить"
│  │ bunker://...         ││
│  └──────────────────────┘│
│                          │
│  [Войти через расширение]│  ← только если window.nostr есть
│                          │
│  ─── ─── ─── ─── ─── ─  │  ← разделитель
│                          │
│  ▸ Использовать nsec     │  ← спойлер (с предупреждением ⚠️)
│    (не рекомендуется)    │
└──────────────────────────┘
```

### 5.3 Desktop layout

```
┌──────────────────────────┐
│     [Hero / Logo]        │
│                          │
│  ╔══════════════════════╗│
│  ║ Войти через          ║│  ← variant="primary"
│  ║ расширение браузера  ║│     Если window.nostr нет:
│  ║ (NIP-07)             ║│     disabled + пояснение
│  ╚══════════════════════╝│
│                          │
│       ─── или ───        │
│                          │
│  ┌──────────────────────┐│
│  │ Nostr Address или    ││  ← инпут + кнопка "Подключить"
│  │ bunker://...         ││
│  └──────────────────────┘│
│                          │
│  ─── ─── ─── ─── ─── ─  │
│                          │
│  ▸ Использовать nsec     │  ← спойлер (с предупреждением ⚠️)
│    (не рекомендуется)    │
└──────────────────────────┘
```

### 5.4 Лоадер (общий для всех методов)

Модальное наложение поверх auth-panel:

```
┌──────────────────────────┐
│     ⏳ Ожидание...       │
│                          │
│  Ожидание подтверждения  │
│  в приложении-сигнере... │
│                          │
│  [Отмена]                │  ← кнопка прерывания
└──────────────────────────┘
```

Состояние лоадера управляется из `useAuthController`:
- `awaitingSigner: { method: "nip55" | "nip46" | "nip07"; cancel: () => void } | null`

### 5.5 NIP-07 disabled-состояние (Desktop)

Если `window.nostr` отсутствует, кнопка NIP-07 отображается, но
`disabled` + тултип/пояснение:
> "Установите расширение для Nostr (nos2x, Alby) в вашем браузере"

---

## Порядок реализации

| Шаг | Блок | Рациональность |
|-----|------|----------------|
| 1 | Блок 1 (platformDetector) | Нужен всем остальным |
| 2 | Блок 5 (AuthScreen) | Реструктуризация — чисто UI, можно сразу |
| 3 | Блок 4 (NIP-07 persistence) | Малый объём, сразу после UI |
| 4 | Блок 2 (NIP-55) | Основной метод для Android |
| 5 | Блок 3 (NIP-46) | Самый сложный, в конце |

---

## Черновики API / Новые файлы

```
frontend/src/adapters/env/
  platformDetector.ts          ← Блок 1

frontend/src/adapters/nostr/
  nip55Signer.ts               ← Блок 2
  nip46Signer.ts               ← Блок 3

frontend/src/application/auth/
  parseBunkerInput.ts          ← Блок 3
  saveNip07Session.ts          ← Блок 4
  connectNip46.ts              ← Блок 3 (use-case)

frontend/src/hooks/
  useNip55Callback.ts          ← Блок 2
  (useAuthController.ts)       ← изменения во всех блоках

frontend/src/domain/
  auth.ts                      ← AuthSession расширение (Блок 4)

frontend/src/components/
  AuthScreen.tsx               ← major rewrite (Блок 5)

frontend/src/App.tsx           ← platform detection + routing (Блок 1, 5)

frontend/src/ports/
  nostrSigner.ts               ← возможно добавить abort сигнал
```

---

## Критерии готовности всего модуля

1. ✅ Mobile: кнопка NIP-55 уходит в Amber, возвращается с pubkey
2. ✅ Mobile: отказ в Amber не ломает приложение
3. ✅ Desktop: NIP-07 вход с восстановлением после перезагрузки
4. ✅ NIP-46: ввод bunker:// или NIP-05 → коннект → подписание
5. ✅ NIP-46: таймаут 30с → ошибка
6. ✅ nsec-фоллбэк: работает как раньше (не сломали)
7. ✅ AuthScreen адаптирован под платформу
8. ✅ Все строки локализованы (en/ru/uk)
