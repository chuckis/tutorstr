План реализации микросервиса ai-assistant/
1. Структура директории
ai-assistant/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Ticket.ts
│   │   ├── ports/
│   │   │   ├── ITicketRepository.ts
│   │   │   ├── INostrGateway.ts
│   │   │   └── ILLMProvider.ts
│   │   └── services/
│   │       ├── TicketService.ts
│   │       └── LLMService.ts
│   ├── adapters/
│   │   ├── nostr/
│   │   │   ├── NostrGateway.ts
│   │   │   └── Crypto.ts
│   │   ├── db/
│   │   │   ├── Database.ts
│   │   │   └── TicketRepository.ts
│   │   └── llm/
│   │       └── OpenRouterProvider.ts
│   └── app/
│       ├── main.ts
│       ├── config.ts
│       └── eventHandler.ts
├── schema.sql
├── .env.example
├── tsconfig.json
└── package.json
2. Протокол обмена (Kind 4 DM)
Входящее ДЗ от студента (encrypted kind 4):
// Tags:
["p", "<BOT_PUBKEY>"]           // маршрутизация боту
["p", "<TUTOR_PUBKEY>"]         // целевой тьютор
["t", "homework-submission"]    // маркер ДЗ
["e", "", "", "root"]           // новый тред (для первого сообщения)

// Decrypted content JSON:
{
  "subject": "Integral calculus #5",
  "content": "Решение задачи...",
  "language": "ru"
}
Ответ бота студенту (NEED_FIX):
// Tags: p=<student>, e=root=<root_id>, e=reply=<parent_id>
["t", "homework-submission"]
["t", "ai-review"]

// Content:
{
  "type": "review_result",
  "status": "NEED_FIX",
  "feedback": "Ошибка в строках 12-15: неправильная производная e^x",
  "suggestions": ["Используй правило цепочки..."]
}
Эскалация тьютору (APPROVED_BY_AI):
// Tags: p=<tutor>, e=root=<root_id>
["t", "homework-submission"]
["t", "ai-escalation"]

// Content:
{
  "type": "escalation",
  "status": "APPROVED_BY_AI",
  "studentPubkey": "<hex>",
  "subject": "Integral calculus #5",
  "summary": "Базовые проверки пройдены. Решение корректно, оформление хорошее.",
  "rootEventId": "<original_root_id>"
}
3. Машина состояний (Ticket Status)
                 ┌──────────────┐
                 │  NEW_TICKET  │
                 └──────┬───────┘
                        │ получено ДЗ
                        ▼
               ┌─────────────────┐
               │ PENDING_REVIEW  │ ───→ LLM запрос
               └────────┬────────┘
                        │ результат LLM
              ┌─────────┴──────────┐
              ▼                    ▼
      ┌───────────┐        ┌──────────────┐
      │ NEED_FIX   │        │ APPROVED_BY  │
      │ (студенту) │        │ _AI          │
      └─────┬─────┘        └──────┬───────┘
            │ студент исправил     │ эскалация
            ▼                      ▼
      ┌───────────┐        ┌──────────────────┐
      │PENDING_RE  │        │ ESCALATED_TO_    │
      │VIEW (loop) │        │ TUTOR (terminal) │
      └───────────┘        └──────────────────┘
Максимум N итераций NEED_FIX → PENDING_REVIEW (конфигурируется, default: 3), после — принудительная эскалация.

4. Слой Domain (нулевая зависимость от IO)
Файл	Содержание
Ticket.ts	Entity: Ticket { rootEventId, studentPubkey, tutorPubkey, status, subject, iteration, createdAt, updatedAt }. Status enum: TicketStatus. Factory createTicket(), method transitionTo(newStatus).
ITicketRepository.ts	Порт: save(ticket), findByRootEventId(id), findActiveByStudent(studentPubkey), updateStatus(rootEventId, status), getMessageHistory(rootEventId), saveMessage(msg)
INostrGateway.ts	Порт: connect(relays), subscribeHomeworkSubmissions(handler), sendEncrypted(recipientPubkey, plaintext, tags), decryptEvent(event)
ILLMProvider.ts	Порт: reviewHomework(subject, content, history, language) → ReviewResult
TicketService.ts	Чистая бизнес-логика: processSubmission(event), handleStudentReply(event), createEscalationSummary(ticket). Вызывает assertRole-подобные проверки.
LLMService.ts	Построение системного промпта, парсинг ответа LLM. Системный промпт на русском/английском в зависимости от language.
5. Слой Adapters
Adapters / DB
Database.ts — инициализация better-sqlite3, выполнение schema.sql при старте (create tables if not exists).
TicketRepository.ts — реализация ITicketRepository через prepared statements.
Схема SQLite (schema.sql):
CREATE TABLE IF NOT EXISTS tickets (
  root_event_id TEXT PRIMARY KEY,
  student_pubkey TEXT NOT NULL,
  tutor_pubkey TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  subject TEXT NOT NULL DEFAULT '',
  iteration INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  root_event_id TEXT NOT NULL REFERENCES tickets(root_event_id),
  event_id TEXT NOT NULL UNIQUE,
  sender_pubkey TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ai', 'student', 'tutor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_root ON messages(root_event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_student ON tickets(student_pubkey);
Adapters / Nostr
Crypto.ts — обёртки над nostr-tools:
- getSharedSecret(signerPrivkey, recipientPubkey) → ConversationKey
- decryptNip44(event, privkey) → plaintext
- encryptNip44(privkey, recipientPubkey, plaintext) → ciphertext
NostrGateway.ts — реализация INostrGateway:
- connect() — инициализация SimplePool, подключение к реле из конфига
- subscribeHomeworkSubmissions(handler) — подписка на kind: 4 с фильтром #t: homework-submission и #p: БОТ_ПУБКЕЙ. Коллбэк получает расшифрованное событие.
- sendEncrypted(recipientPubkey, plaintext, tags) — шифрует NIP-44 и публикует kind: 4
- decryptEvent(event) — по event'у определяет тип шифрования (NIP-44 primary, NIP-04 fallback) и возвращает plaintext
Adapters / LLM
OpenRouterProvider.ts — реализация ILLMProvider:
- HTTP POST к https://openrouter.ai/api/v1/chat/completions
- Системный промпт + история сообщений + текущее ДЗ
- Парсинг ответа: извлечение feedback, status (approved / needs_fix)
- Таймаут 30s, retry 2 раза
- Модель конфигурируется через .env
6. Слой Application
config.ts — чтение .env:
NOSTR_RELAYS=ws://localhost:5555,wss://relay.damus.io
BOT_PRIVATE_KEY=nsec...
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
MAX_AI_ITERATIONS=3
ALLOWED_STUDENTS=npub1...,npub2...
ALLOWED_TUTORS=npub3...,npub4...
eventHandler.ts — основной обработчик событий:
1. Получает расшифрованное событие от NostrGateway
2. Определяет: новое ДЗ или ответ в существующий тикет (по тегам e root/reply)
3. Извлекает tutorPubkey из тегов p
4. Вызывает TicketService.processSubmission() или TicketService.handleStudentReply()
5. В зависимости от статуса: отправляет ответ студенту или эскалирует тьютору
6. Сохраняет сообщение в TicketRepository.saveMessage()
main.ts — точка входа:
1. Читает конфиг
2. Инициализирует адаптеры (DB, Nostr, LLM)
3. Создаёт сервисы
4. Запускает подписку
5. process.on('SIGINT', gracefulShutdown)
7. План по шагам
   
   
Шаг	Описание
1	Создать ai-assistant/package.json, tsconfig.json, .env.example
2	Написать schema.sql
3	Domain: Ticket.ts — entity + status enum
4	Domain: три порта (интерфейсы)
5	Domain: TicketService.ts — state machine + валидация
6	Domain: LLMService.ts — системный промпт, парсинг
7	Adapter: Database.ts — SQLite init + миграция
8	Adapter: TicketRepository.ts — все CRUD методы
9	Adapter: Crypto.ts — NIP-44 encrypt/decrypt обёртки
10	Adapter: NostrGateway.ts — SimplePool, подписка, публикация
11	Adapter: OpenRouterProvider.ts — HTTP клиент + парсинг
12	Application: config.ts
13	Application: eventHandler.ts — оркестрация обработки
14	Application: main.ts — композиция + graceful shutdown
15	Тесты: unit-тесты TicketService (state machine), интеграционные тесты DB
1. Тестирование
- Unit: TicketService — чистая логика, тестируем все переходы по state machine, включая лимит итераций
- Unit: LLMService — парсинг разных форматов ответа LLM
- Integration: TicketRepository — CRUD через реальный SQLite (в памяти)
- Integration: Crypto — encrypt/decrypt roundtrip с известными ключами
- E2E (ручной): запуск бота, отправка ДЗ через любой Nostr-клиент
Стейт-машина должна быть протестирована на:
- Новый тикет → PENDING_REVIEW
- LLM ответил с ошибками → NEED_FIX, ответ студенту
- Студент исправил → PENDING_REVIEW (повтор)
- Превышен лимит итераций → принудительная ESCALATED_TO_TUTOR
- LLM одобрил → APPROVED_BY_AI → ESCALATED_TO_TUTOR
- Попытка перехода из терминального состояния (игнорируется)
1. Зависимости (npm)
{
  "dependencies": {
    "nostr-tools": "^2.x",
    "better-sqlite3": "^11.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/better-sqlite3": "^7.x",
    "@types/node": "^22.x",
    "vitest": "^3.x"
  }
}
No ws, fetch, crypto needed — всё встроено в Node 20+