export enum TicketStatus {
  PendingReview = "PENDING_REVIEW",
  NeedFix = "NEED_FIX",
  ApprovedByAI = "APPROVED_BY_AI",
  EscalatedToTutor = "ESCALATED_TO_TUTOR",
}

export const TERMINAL_STATUSES: readonly TicketStatus[] = [
  TicketStatus.EscalatedToTutor,
];

export function isTerminal(status: TicketStatus): boolean {
  return (TERMINAL_STATUSES as readonly TicketStatus[]).includes(status);
}

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.PendingReview]: [TicketStatus.NeedFix, TicketStatus.ApprovedByAI, TicketStatus.EscalatedToTutor],
  [TicketStatus.NeedFix]: [TicketStatus.PendingReview],
  [TicketStatus.ApprovedByAI]: [TicketStatus.EscalatedToTutor],
  [TicketStatus.EscalatedToTutor]: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface Ticket {
  rootEventId: string;
  studentPubkey: string;
  tutorPubkey: string;
  status: TicketStatus;
  subject: string;
  iteration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketParams {
  rootEventId: string;
  studentPubkey: string;
  tutorPubkey: string;
  subject: string;
}

export function createTicket(params: CreateTicketParams): Ticket {
  const now = new Date();
  return {
    rootEventId: params.rootEventId,
    studentPubkey: params.studentPubkey,
    tutorPubkey: params.tutorPubkey,
    status: TicketStatus.PendingReview,
    subject: params.subject,
    iteration: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionTicket(
  ticket: Ticket,
  newStatus: TicketStatus,
): Ticket {
  if (!canTransition(ticket.status, newStatus)) {
    throw new Error(
      `Invalid transition: ${ticket.status} -> ${newStatus}`,
    );
  }
  return {
    ...ticket,
    status: newStatus,
    updatedAt: new Date(),
    iteration:
      newStatus === TicketStatus.PendingReview
        ? ticket.iteration + 1
        : ticket.iteration,
  };
}

export interface Message {
  id?: number;
  rootEventId: string;
  eventId: string;
  senderPubkey: string;
  content: string;
  role: "ai" | "student" | "tutor";
  createdAt: Date;
}
