# AI Assistant Microservice — Implementation Plan

## Overview

Standalone Nostr bot acting as L1 Support (Triage Agent) for Tutorhub.
Receives homework submissions from students, analyzes via LLM, provides
feedback or escalates to a human tutor.

**Repository location:** `ai-assistant/` (repo root, sibling of `frontend/` and `relay/`)

---

## Stack

- **Runtime:** Node.js + tsx (TypeScript execution)
- **Nostr:** `nostr-tools` v2 (SimplePool, NIP-44)
- **Database:** SQLite via `better-sqlite3`
- **LLM:** OpenRouter API (direct fetch, no LangChain)
- **Encryption:** NIP-44 (`nip44.v2` from nostr-tools)

---

## Architecture (Ports & Adapters)

```
src/
├── domain/               # Pure business logic — zero IO dependencies
│   ├── entities/
│   │   └── Ticket.ts     # Entity + TicketStatus enum + factory
│   ├── ports/
│   │   ├── ITicketRepository.ts   # Persistence contract
│   │   ├── INostrGateway.ts       # Nostr comms contract
│   │   └── ILLMProvider.ts        # LLM API contract
│   └── services/
│       ├── TicketService.ts       # State machine + orchestration
│       └── LLMService.ts          # Prompt building + response parsing
├── adapters/
│   ├── nostr/
│   │   ├── NostrGateway.ts        # SimplePool, subscribe, publish
│   │   └── Crypto.ts              # NIP-44 encrypt/decrypt wrappers
│   ├── db/
│   │   ├── Database.ts            # SQLite init + schema migration
│   │   └── TicketRepository.ts    # ITicketRepository implementation
│   └── llm/
│       └── OpenRouterProvider.ts  # HTTP client for OpenRouter
└── app/
    ├── main.ts                    # Entry point, composition root
    ├── config.ts                  # .env config reader
    └── eventHandler.ts            # Event processing pipeline
```

---

## Message Protocol

### Incoming homework submission (`kind: 4`, NIP-44 encrypted)

Tags:
- `["p", "<BOT_PUBKEY>"]`
- `["p", "<TUTOR_PUBKEY>"]`
- `["t", "homework-submission"]`
- `["e", "", "", "root"]` (new thread) or `["e", "<ROOT_ID>", "", "root"]` (reply)

Decrypted content:
```json
{
  "subject": "Integral calculus #5",
  "content": "Solution text...",
  "language": "ru"
}
```

### Bot response to student (NEED_FIX)

Tags: `p=<student>`, `e=root=<root_id>`, `e=reply=<parent_id>`, `t=homework-submission`, `t=ai-review`

Content:
```json
{
  "type": "review_result",
  "status": "NEED_FIX",
  "feedback": "Ошибка в строках 12-15",
  "suggestions": ["..."]
}
```

### Bot escalation to tutor (APPROVED_BY_AI)

Tags: `p=<tutor>`, `e=root=<root_id>`, `t=homework-submission`, `t=ai-escalation`

Content:
```json
{
  "type": "escalation",
  "status": "APPROVED_BY_AI",
  "studentPubkey": "<hex>",
  "subject": "Integral calculus #5",
  "summary": "Базовые проверки пройдены",
  "rootEventId": "<original_root_id>"
}
```

---

## State Machine

```
                  ┌──────────────┐
                  │  NEW_TICKET  │
                  └──────┬───────┘
                         │ received homework
                         ▼
                ┌─────────────────┐
                │ PENDING_REVIEW  │ ───→ LLM request
                └────────┬────────┘
                         │ LLM result
              ┌──────────┴──────────┐
              ▼                     ▼
      ┌─────────────┐      ┌───────────────┐
      │  NEED_FIX    │      │ APPROVED_BY   │
      │ (→ student)  │      │ _AI           │
      └──────┬───────┘      └───────┬───────┘
             │ student fixes        │ escalate
             ▼                      ▼
      ┌─────────────┐      ┌──────────────────┐
      │ PENDING_RE  │      │ ESCALATED_TO_    │
      │ VIEW (loop) │      │ TUTOR (terminal) │
      └─────────────┘      └──────────────────┘
```

Max iterations `NEED_FIX → PENDING_REVIEW`: configurable (default 3).
After limit → forced escalation to tutor.

---

## SQLite Schema

```sql
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
```

---

## Implementation Steps

| # | Description | Layer |
|---|-------------|-------|
| 1 | Project scaffolding: `package.json`, `tsconfig.json`, `.env.example` | root |
| 2 | `schema.sql` — SQLite schema | db |
| 3 | `Ticket.ts` — entity + `TicketStatus` enum | domain/entities |
| 4 | Ports: `ITicketRepository`, `INostrGateway`, `ILLMProvider` | domain/ports |
| 5 | `TicketService.ts` — state machine + validation | domain/services |
| 6 | `LLMService.ts` — system prompt + response parsing | domain/services |
| 7 | `Database.ts` — SQLite init + migration | adapters/db |
| 8 | `TicketRepository.ts` — CRUD implementation | adapters/db |
| 9 | `Crypto.ts` — NIP-44 encrypt/decrypt wrappers | adapters/nostr |
| 10 | `NostrGateway.ts` — SimplePool, subscribe, publish | adapters/nostr |
| 11 | `OpenRouterProvider.ts` — LLM HTTP client | adapters/llm |
| 12 | `config.ts` — env config reader | app |
| 13 | `eventHandler.ts` — event processing pipeline | app |
| 14 | `main.ts` — composition root + graceful shutdown | app |
| 15 | Tests — TicketService unit + TicketRepository integration | __tests__ |

---

## npm Dependencies

```json
{
  "dependencies": {
    "nostr-tools": "^2.10",
    "better-sqlite3": "^11.7"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/better-sqlite3": "^7.6",
    "@types/node": "^22.13",
    "vitest": "^3.0"
  }
}
```

---

## Testing Strategy

- **Unit:** `TicketService` — all state machine transitions, iteration limit, terminal state rejection
- **Unit:** `LLMService` — response parsing (various LLM output formats)
- **Integration:** `TicketRepository` — CRUD via in-memory SQLite
- **Integration:** `Crypto` — NIP-44 encrypt/decrypt roundtrip with known keys
- **Manual E2E:** Run bot, send homework via any Nostr client
