import type Database from "better-sqlite3";
import type { Ticket, Message } from "../../domain/entities/Ticket.js";
import { TicketStatus } from "../../domain/entities/Ticket.js";
import type { ITicketRepository } from "../../domain/ports/ITicketRepository.js";

interface TicketRow {
  root_event_id: string;
  student_pubkey: string;
  tutor_pubkey: string;
  status: string;
  subject: string;
  iteration: number;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  root_event_id: string;
  event_id: string;
  sender_pubkey: string;
  content: string;
  role: string;
  created_at: string;
}

function rowToTicket(row: TicketRow): Ticket {
  return {
    rootEventId: row.root_event_id,
    studentPubkey: row.student_pubkey,
    tutorPubkey: row.tutor_pubkey,
    status: row.status as TicketStatus,
    subject: row.subject,
    iteration: row.iteration,
    createdAt: new Date(row.created_at + "Z"),
    updatedAt: new Date(row.updated_at + "Z"),
  };
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    rootEventId: row.root_event_id,
    eventId: row.event_id,
    senderPubkey: row.sender_pubkey,
    content: row.content,
    role: row.role as "ai" | "student" | "tutor",
    createdAt: new Date(row.created_at + "Z"),
  };
}

export class TicketRepository implements ITicketRepository {
  private readonly stmts: {
    insertTicket: Database.Statement;
    getTicket: Database.Statement<[string]>;
    findActiveByStudent: Database.Statement<[string]>;
    updateStatus: Database.Statement;
    updateIteration: Database.Statement;
    insertMessage: Database.Statement;
    getMessages: Database.Statement<[string]>;
  };

  constructor(db: Database.Database) {
    this.stmts = {
      insertTicket: db.prepare(`
        INSERT INTO tickets (root_event_id, student_pubkey, tutor_pubkey, status, subject, iteration, created_at, updated_at)
        VALUES (@root_event_id, @student_pubkey, @tutor_pubkey, @status, @subject, @iteration, @created_at, @updated_at)
      `),
      getTicket: db.prepare("SELECT * FROM tickets WHERE root_event_id = ?"),
      findActiveByStudent: db.prepare(
        "SELECT * FROM tickets WHERE student_pubkey = ? AND status NOT IN ('ESCALATED_TO_TUTOR')",
      ),
      updateStatus: db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE root_event_id = ?"),
      updateIteration: db.prepare("UPDATE tickets SET iteration = ?, updated_at = datetime('now') WHERE root_event_id = ?"),
      insertMessage: db.prepare(`
        INSERT INTO messages (root_event_id, event_id, sender_pubkey, content, role, created_at)
        VALUES (@root_event_id, @event_id, @sender_pubkey, @content, @role, @created_at)
      `),
      getMessages: db.prepare(
        "SELECT * FROM messages WHERE root_event_id = ? ORDER BY created_at ASC",
      ),
    };
  }

  async save(ticket: Ticket): Promise<void> {
    this.stmts.insertTicket.run({
      root_event_id: ticket.rootEventId,
      student_pubkey: ticket.studentPubkey,
      tutor_pubkey: ticket.tutorPubkey,
      status: ticket.status,
      subject: ticket.subject,
      iteration: ticket.iteration,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    });
  }

  async findByRootEventId(rootEventId: string): Promise<Ticket | null> {
    const row = this.stmts.getTicket.get(rootEventId) as TicketRow | undefined;
    return row ? rowToTicket(row) : null;
  }

  async findActiveByStudent(studentPubkey: string): Promise<Ticket[]> {
    const rows = this.stmts.findActiveByStudent.all(studentPubkey) as TicketRow[];
    return rows.map(rowToTicket);
  }

  async updateStatus(rootEventId: string, status: TicketStatus): Promise<void> {
    this.stmts.updateStatus.run(status, rootEventId);
  }

  async updateIteration(rootEventId: string, iteration: number): Promise<void> {
    this.stmts.updateIteration.run(iteration, rootEventId);
  }

  async saveMessage(msg: Message): Promise<void> {
    this.stmts.insertMessage.run({
      root_event_id: msg.rootEventId,
      event_id: msg.eventId,
      sender_pubkey: msg.senderPubkey,
      content: msg.content,
      role: msg.role,
      created_at: msg.createdAt.toISOString(),
    });
  }

  async getMessageHistory(rootEventId: string): Promise<Message[]> {
    const rows = this.stmts.getMessages.all(rootEventId) as MessageRow[];
    return rows.map(rowToMessage);
  }
}
