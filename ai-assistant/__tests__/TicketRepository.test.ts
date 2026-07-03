import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TicketRepository } from "../src/adapters/db/TicketRepository.js";
import { TicketStatus, createTicket } from "../src/domain/entities/Ticket.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "schema.sql");

describe("TicketRepository", () => {
  let db: Database.Database;
  let repo: TicketRepository;

  beforeAll(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");

    const schema = readFileSync(SCHEMA_PATH, "utf-8");
    db.exec(schema);

    repo = new TicketRepository(db);
  });

  afterAll(() => {
    db.close();
  });

  it("saves and retrieves a ticket", async () => {
    const ticket = createTicket({
      rootEventId: "test1",
      studentPubkey: "student_a",
      tutorPubkey: "tutor_a",
      subject: "Physics HW",
    });

    await repo.save(ticket);

    const found = await repo.findByRootEventId("test1");
    expect(found).not.toBeNull();
    expect(found!.rootEventId).toBe("test1");
    expect(found!.studentPubkey).toBe("student_a");
    expect(found!.tutorPubkey).toBe("tutor_a");
    expect(found!.subject).toBe("Physics HW");
    expect(found!.status).toBe(TicketStatus.PendingReview);
  });

  it("returns null for non-existent ticket", async () => {
    const found = await repo.findByRootEventId("nonexistent");
    expect(found).toBeNull();
  });

  it("finds active tickets by student", async () => {
    const t1 = createTicket({ rootEventId: "active1", studentPubkey: "student_b", tutorPubkey: "tutor_b", subject: "HW1" });
    const t2 = createTicket({ rootEventId: "active2", studentPubkey: "student_b", tutorPubkey: "tutor_b", subject: "HW2" });

    await repo.save(t1);
    await repo.save(t2);

    const active = await repo.findActiveByStudent("student_b");
    expect(active.length).toBeGreaterThanOrEqual(2);
  });

  it("updates ticket status", async () => {
    await repo.updateStatus("test1", TicketStatus.NeedFix);

    const found = await repo.findByRootEventId("test1");
    expect(found!.status).toBe(TicketStatus.NeedFix);
  });

  it("updates ticket iteration", async () => {
    await repo.updateIteration("test1", 2);

    const found = await repo.findByRootEventId("test1");
    expect(found!.iteration).toBe(2);
  });

  it("saves and retrieves messages", async () => {
    const msg = {
      rootEventId: "test1",
      eventId: "msg1",
      senderPubkey: "student_a",
      content: "my homework",
      role: "student" as const,
      createdAt: new Date(),
    };

    await repo.saveMessage(msg);

    const history = await repo.getMessageHistory("test1");
    expect(history.length).toBe(1);
    expect(history[0]!.eventId).toBe("msg1");
    expect(history[0]!.content).toBe("my homework");
    expect(history[0]!.role).toBe("student");
  });
});
