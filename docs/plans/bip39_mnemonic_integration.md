# Интеграция BIP-39 (Мнемоники) в архитектуру авторизации TutorHub

## Статус (June 2026)

План реализуется поверх существующей системы авторизации (vault-синьер,
AES-256-GCM + PBKDF2, AuthScreen, DashboardSettingsDrawer). На момент
написания плана импорт мнемоники через `nostr-tools/nip06` уже работает,
но генерация и экспорт мнемоники отсутствуют полностью. Silent Registration
не реализована.

---

## Gap Analysis (исходное состояние перед реализацией)

### ✅ Что уже реализовано
| Компонент | Статус | Файл |
|-----------|--------|------|
| Импорт мнемоники (12/24 слов) | ✅ Частично | `nostrKeyMaterial.parseSecretInput()` |
| Поле ввода при импорте | ✅ | `AuthScreen.tsx` — Textarea |
| Экспорт nsec | ✅ | `DashboardSettingsDrawer.tsx` — reveal nsec |
| Бэкап при создании (nsec) | ✅ | `AuthScreen.tsx` — nsec + checkbox |
| Vault в localStorage | ✅ | `localStorageVaultRepository.ts` |

### ❌ Чего нет
| Компонент | Статус | Причина |
|-----------|--------|---------|
| `@scure/bip39` в зависимостях | ❌ | Не установлен |
| `@scure/bip32` в зависимостях | ❌ | Не установлен |
| Генерация мнемоники | ❌ | `createNewProfile` → raw hex, нет BIP-39 |
| Silent Registration | ❌ | Многошаговый UX, не фоновый |
| Хранение mnemonic в vault | ❌ | `VaultRecord` не имеет поля `mnemonic` |
| UI экспорта мнемоники (карточки) | ❌ | Только nsec в settings |
| Кнопка "Copy to clipboard" | ❌ | Отсутствует |
| Спойлер "Для экспертов" | ❌ | Нет в settings |
| Валидация word count при импорте | ❌ | `catch { throw }` без специфичных ошибок |
| `validateMnemonic()` checksum | ❌ | Используется `nostr-tools/nip06`, не `@scure/bip39` |

---

## Блок 1: Установка зависимостей

**Файл:** `frontend/package.json`

```bash
npm install @scure/bip39 @scure/bip32
```

- `@scure/bip39` — генерация энтропии → мнемоника, валидация
- `@scure/bip32` — seed → приватный ключ по BIP-32 пути
- Импорт словаря строго: `import { wordlist } from '@scure/bip39/wordlists/english'`

---

## Блок 2: Расширение порта NostrKeyMaterial

**Файл:** `frontend/src/ports/nostrKeyMaterial.ts`

Добавить методы:

```typescript
generateMnemonic: () => string;
mnemonicToSeed: (mnemonic: string) => Uint8Array;
```

---

## Блок 3: Реализация адаптера

**Файл:** `frontend/src/adapters/auth/nostrKeyMaterial.ts`

Добавить/изменить:

1. `generateMnemonic()` — 128-bit entropy → 12 слов (английский словарь)
2. `mnemonicToSeed()` — мнемоника → seed (BIP-39, без passphrase)
3. `seedToPrivkey()` (утилита) — seed → master key → `m/44'/1237'/0'/0/0` → privkey
4. `parseSecretInput()` — добавить:
   - Проверку word count (12 или 24) → специфичная ошибка
   - `validateMnemonic(text, wordlist)` → специфичная ошибка при неверном checksum
5. Импортировать только `@scure/bip39/wordlists/english`

---

## Блок 4: Silent Registration

**Файлы:** `createNewProfile.ts`, `saveGeneratedProfile.ts`, `useAuthController.ts`, `AuthScreen.tsx`

1. `generateMnemonicProfile` (новый use-case) — аналог `createNewProfile`, но:
   - Генерирует мнемонику (а не raw nsec)
   - Сохраняет мнемонику в `VaultRecord`
   - Возвращает `{ session, nsec, mnemonic }`

2. `VaultRecord` — версия 3, добавить поле:
   ```typescript
   mnemonic?: string;
   ```

3. `saveGeneratedProfile` — сохранять `mnemonic` если передан

4. `useAuthController` — опционально: при `mode === "welcome"` без пользовательского ввода запускать silent registration (если не выбран NIP-07/46/55)

5. `AuthScreen` — добавить отображение мнемоники карточками вместо/вместе с nsec

---

## Блок 5: Экспорт мнемоники (Settings)

**Файл:** `frontend/src/components/DashboardSettingsDrawer.tsx`

Обновить секцию Session (строки 205-224):

1. Поле master password + кнопка "Показать сид-фразу"
2. Отображение 12 слов — нумерованные карточки (CSS grid)
3. Кнопка "Копировать в буфер обмена"
4. Спойлер "Для экспертов" — внутри `nsec`

---

## Блок 6: Обновление экспортного use-case

**Файл:** `frontend/src/application/auth/exportSecretKey.ts`

Изменить возвращаемое значение:

```typescript
return { nsec: string; mnemonic: string };
```

Читать `mnemonic` из vault, если есть.

---

## Блок 7: i18n

**Файлы:** `frontend/src/locales/{en,ru,uk}/auth.json`, `profile.json`

Добавить ключи:
- `auth.mnemonicBackupTitle` — "Your recovery phrase"
- `auth.mnemonicBackupBody` — "Write down these 12 words in order..."
- `auth.mnemonicCopy` — "Copy to clipboard"
- `auth.mnemonicCopied` — "Copied!"
- `auth.mnemonicExpertSpoiler` — "For experts"
- `auth.errors.wordCount` — "The phrase must consist of {{count}} words"
- `auth.errors.invalidMnemonic` — "Invalid phrase. Check the spelling."
- `profile.revealMnemonicButton` — "Show recovery phrase"
- `profile.revealMnemonicPassword` — "Master password to reveal recovery phrase"

---

## Блок 8: Vault миграция

**Файл:** `frontend/src/domain/auth.ts`

1. `AUTH_VAULT_VERSION = 3`
2. `VaultRecord` — добавить опциональное `mnemonic?: string`
3. `migrateVaultRecord()` — обновить для версии 2→3 (не терять старые поля)

---

## Порядок реализации

1. `npm install @scure/bip39 @scure/bip32` → package.json
2. Обновить `NostrKeyMaterial` порт (новые методы)
3. Обновить адаптер `nostrKeyMaterial.ts` (generateMnemonic, mnemonicToSeed, validate)
4. Обновить `VaultRecord` (версия 3, поле mnemonic, миграция)
5. Обновить `saveGeneratedProfile.ts` / `importExistingKey.ts`
6. Обновить `exportSecretKey.ts` (возвращать объект с mnemonic)
7. Обновить `createNewProfile.ts` / `generateMnemonicProfile.ts`
8. Обновить `useAuthController.ts` (silent registration, reveal mnemonic)
9. Обновить `DashboardSettingsDrawer.tsx` (UI карточек + copy + spoiler)
10. Обновить `AuthScreen.tsx` (отображение мнемоники при создании)
11. i18n ключи (en, ru, uk)
12. Тесты

## Критерии приемки

- [ ] Размер чанка авторизации увеличился не более чем на ~15-20 Кб
- [ ] Сид-фраза, сгенерированная в TutorHub, восстанавливает тот же npub в Amethyst
- [ ] Ввод невалидной фразы блокируется валидатором с понятной ошибкой
- [ ] Vault v2 → v3 миграция не ломает существующие аккаунты
- [ ] `@scure/bip39/wordlists/english` — единственный импортированный словарь
