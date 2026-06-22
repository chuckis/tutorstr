# Relay: SQLite Migration for Local Dev

## Цель
Заменить in-memory хранилище (`slicestore.SliceStore`) на SQLite (`eventstore/sqlite3.SQLite3Backend`) для персистентности данных релея при локальной разработке.

## Изменения

### main.go
- Импорт: `slicestore` → `sqlite3` (`github.com/fiatjaf/eventstore/sqlite3`)
- Инициализация SQLite3Backend с `DatabaseURL: "tutorhub.db"`, вызов `Init()`
- Все StoreEvent/QueryEvents/DeleteEvent/ReplaceEvent переключаются на `db`
- QueryEvents-логгер (middleware) переключается на `db.QueryEvents`
- OnEventSaved-логгер остаётся без изменений

### Конфигурация (dev)
- Путь к БД: `"tutorhub.db"` (хардкод)
- Порт: `:5555` (хардкод)
- NIP-11 поля: хардкод (Name, Description, PubKey, Contact)

### Не делаем
- `.env` / godotenv
- `slog`

## Проверка
1. `go build` — без ошибок
2. Запуск — создаётся `tutorhub.db`
3. Отправка тестового события — OK
4. Перезапуск — данные сохранились
