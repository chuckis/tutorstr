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
