import { describe, it, expect } from "vitest";
import {
  TicketStatus,
  createTicket,
  transitionTicket,
  canTransition,
  isTerminal,
} from "../src/domain/entities/Ticket.js";

describe("Ticket Entity", () => {
  const params = {
    rootEventId: "abc123",
    studentPubkey: "student1",
    tutorPubkey: "tutor1",
    subject: "Math HW",
  };

  it("creates a ticket with PENDING_REVIEW status", () => {
    const ticket = createTicket(params);
    expect(ticket.rootEventId).toBe("abc123");
    expect(ticket.studentPubkey).toBe("student1");
    expect(ticket.tutorPubkey).toBe("tutor1");
    expect(ticket.subject).toBe("Math HW");
    expect(ticket.status).toBe(TicketStatus.PendingReview);
    expect(ticket.iteration).toBe(0);
  });

  it("transitions PENDING_REVIEW -> NEED_FIX", () => {
    const ticket = createTicket(params);
    const updated = transitionTicket(ticket, TicketStatus.NeedFix);
    expect(updated.status).toBe(TicketStatus.NeedFix);
    expect(updated.iteration).toBe(0);
  });

  it("transitions PENDING_REVIEW -> APPROVED_BY_AI", () => {
    const ticket = createTicket(params);
    const updated = transitionTicket(ticket, TicketStatus.ApprovedByAI);
    expect(updated.status).toBe(TicketStatus.ApprovedByAI);
  });

  it("transitions PENDING_REVIEW -> ESCALATED_TO_TUTOR (forced)", () => {
    const ticket = createTicket(params);
    const updated = transitionTicket(ticket, TicketStatus.EscalatedToTutor);
    expect(updated.status).toBe(TicketStatus.EscalatedToTutor);
  });

  it("transitions NEED_FIX -> PENDING_REVIEW, incrementing iteration", () => {
    const ticket = createTicket(params);
    const needFix = transitionTicket(ticket, TicketStatus.NeedFix);
    const retry = transitionTicket(needFix, TicketStatus.PendingReview);
    expect(retry.status).toBe(TicketStatus.PendingReview);
    expect(retry.iteration).toBe(1);
  });

  it("transitions APPROVED_BY_AI -> ESCALATED_TO_TUTOR", () => {
    const ticket = createTicket(params);
    const approved = transitionTicket(ticket, TicketStatus.ApprovedByAI);
    const escalated = transitionTicket(approved, TicketStatus.EscalatedToTutor);
    expect(escalated.status).toBe(TicketStatus.EscalatedToTutor);
  });

  it("rejects invalid transitions (NEED_FIX -> APPROVED_BY_AI)", () => {
    const ticket = createTicket(params);
    const needFix = transitionTicket(ticket, TicketStatus.NeedFix);
    expect(() => transitionTicket(needFix, TicketStatus.ApprovedByAI)).toThrow("Invalid transition");
  });

  it("rejects transitions from terminal state", () => {
    const ticket = createTicket(params);
    const escalated = transitionTicket(ticket, TicketStatus.EscalatedToTutor);
    expect(() => transitionTicket(escalated, TicketStatus.PendingReview)).toThrow("Invalid transition");
  });

  it("canTransition returns correct values", () => {
    expect(canTransition(TicketStatus.PendingReview, TicketStatus.NeedFix)).toBe(true);
    expect(canTransition(TicketStatus.PendingReview, TicketStatus.ApprovedByAI)).toBe(true);
    expect(canTransition(TicketStatus.PendingReview, TicketStatus.EscalatedToTutor)).toBe(true);
    expect(canTransition(TicketStatus.NeedFix, TicketStatus.PendingReview)).toBe(true);
    expect(canTransition(TicketStatus.ApprovedByAI, TicketStatus.EscalatedToTutor)).toBe(true);
    expect(canTransition(TicketStatus.EscalatedToTutor, TicketStatus.PendingReview)).toBe(false);
    expect(canTransition(TicketStatus.EscalatedToTutor, TicketStatus.NeedFix)).toBe(false);
  });

  it("isTerminal returns true only for terminal states", () => {
    expect(isTerminal(TicketStatus.PendingReview)).toBe(false);
    expect(isTerminal(TicketStatus.NeedFix)).toBe(false);
    expect(isTerminal(TicketStatus.ApprovedByAI)).toBe(false);
    expect(isTerminal(TicketStatus.EscalatedToTutor)).toBe(true);
  });
});
