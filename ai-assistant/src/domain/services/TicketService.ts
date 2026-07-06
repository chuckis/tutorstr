import {
  TicketStatus,
  createTicket,
  transitionTicket,
  isTerminal,
  type Ticket,
  type Message,
} from "../entities/Ticket.js";
import type { ITicketRepository } from "../ports/ITicketRepository.js";
import type { ILLMProvider, ReviewResult } from "../ports/ILLMProvider.js";
import type { INostrGateway, DecryptedEvent } from "../ports/INostrGateway.js";

export class TicketService {
  constructor(
    private readonly repo: ITicketRepository,
    private readonly llm: ILLMProvider,
    private readonly nostr: INostrGateway,
    private readonly maxIterations: number = 3,
  ) {}

  async processNewSubmission(ev: DecryptedEvent): Promise<void> {
    const ticket = createTicket({
      rootEventId: ev.event.id,
      studentPubkey: ev.studentPubkey,
      tutorPubkey: ev.tutorPubkey,
      subject: this.extractSubject(ev.plaintext),
    });

    await this.repo.save(ticket);

    const review = await this.llm.reviewHomework({
      subject: ticket.subject,
      content: ev.plaintext,
      language: "auto",
      history: [],
    });

    await this.handleReviewResult(ticket, review, ev.event.id, ev.threadTag);
  }

  async processStudentReply(ev: DecryptedEvent): Promise<void> {
    const rootId = ev.rootEventId;
    if (!rootId) return;

    const ticket = await this.repo.findByRootEventId(rootId);
    if (!ticket || isTerminal(ticket.status)) return;

    const msg: Message = {
      rootEventId: rootId,
      eventId: ev.event.id,
      senderPubkey: ev.studentPubkey,
      content: ev.plaintext,
      role: "student",
      createdAt: new Date(),
    };
    await this.repo.saveMessage(msg);

    let reviewing: Ticket;
    if (ticket.status === TicketStatus.NeedFix) {
      reviewing = transitionTicket(ticket, TicketStatus.PendingReview);
      await this.repo.updateStatus(reviewing.rootEventId, reviewing.status);
      if (reviewing.iteration !== ticket.iteration) {
        await this.repo.updateIteration(reviewing.rootEventId, reviewing.iteration);
      }
    } else {
      reviewing = ticket;
    }

    if (reviewing.iteration >= this.maxIterations) {
      const escalated = transitionTicket(reviewing, TicketStatus.EscalatedToTutor);
      await this.repo.updateStatus(escalated.rootEventId, escalated.status);
      await this.escalateToTutor(escalated, null, false, ev.threadTag);
      return;
    }

    const history = await this.buildHistory(reviewing);
    const review = await this.llm.reviewHomework({
      subject: reviewing.subject,
      content: ev.plaintext,
      language: "auto",
      history,
    });

    const resultTicket = transitionTicket(
      reviewing,
      review.status === "approved"
        ? TicketStatus.ApprovedByAI
        : TicketStatus.NeedFix,
    );
    await this.repo.updateStatus(resultTicket.rootEventId, resultTicket.status);

    if (review.status === "needs_fix") {
      await this.sendFeedback(resultTicket, review, ev.event.id, ev.threadTag);
    } else {
      const escalated = transitionTicket(resultTicket, TicketStatus.EscalatedToTutor);
      await this.repo.updateStatus(escalated.rootEventId, escalated.status);
      await this.escalateToTutor(escalated, review, true, ev.threadTag);
    }
  }

  private async handleReviewResult(
    ticket: Ticket,
    review: ReviewResult,
    parentEventId: string,
    threadTag?: string,
  ): Promise<void> {
    if (review.status === "needs_fix") {
      if (ticket.iteration >= this.maxIterations) {
        const escalated = transitionTicket(ticket, TicketStatus.EscalatedToTutor);
        await this.repo.updateStatus(escalated.rootEventId, escalated.status);
        await this.escalateToTutor(escalated, review, false, threadTag);
        return;
      }

      const needFix = transitionTicket(ticket, TicketStatus.NeedFix);
      await this.repo.updateStatus(needFix.rootEventId, needFix.status);
      await this.sendFeedback(needFix, review, parentEventId, threadTag);
      return;
    }

    const approved = transitionTicket(ticket, TicketStatus.ApprovedByAI);
    await this.repo.updateStatus(approved.rootEventId, approved.status);

    const escalated = transitionTicket(approved, TicketStatus.EscalatedToTutor);
    await this.repo.updateStatus(escalated.rootEventId, escalated.status);
    await this.escalateToTutor(escalated, review, true, threadTag);
  }

  private async sendFeedback(
    ticket: Ticket,
    review: ReviewResult,
    parentEventId: string,
    threadTag?: string,
  ): Promise<void> {
    const payload = JSON.stringify({
      type: "review_result",
      status: "NEED_FIX",
      feedback: review.feedback,
      suggestions: review.suggestions,
    });

    await this.nostr.sendEncrypted({
      recipientPubkey: ticket.studentPubkey,
      plaintext: payload,
      tags: [
        ["p", ticket.studentPubkey],
        ["e", ticket.rootEventId, "", "root"],
        ["e", parentEventId, "", "reply"],
        ["t", "homework-submission"],
        ["t", "ai-review"],
        ...(threadTag ? [["thread", threadTag]] : []),
      ],
    });
  }

  private async escalateToTutor(
    _ticket: Ticket,
    review: ReviewResult | null,
    approvedByAI: boolean,
    threadTag?: string,
  ): Promise<void> {
    const payload = JSON.stringify({
      type: "escalation",
      status: approvedByAI ? "APPROVED_BY_AI" : "FORCED_ESCALATION",
      studentPubkey: _ticket.studentPubkey,
      subject: _ticket.subject,
      summary: approvedByAI
        ? (review?.feedback ?? "Homework approved — sent to tutor.")
        : `Превышен лимит итераций (${this.maxIterations}). Принудительная эскалация.`,
      rootEventId: _ticket.rootEventId,
    });

    const commonTags: string[][] = [
      ["e", _ticket.rootEventId, "", "root"],
      ["t", "homework-submission"],
      ["t", "ai-escalation"],
      ...(threadTag ? [["thread", threadTag]] : []),
    ];

    const tasks: Promise<string>[] = [];

    tasks.push(this.nostr.sendEncrypted({
      recipientPubkey: _ticket.tutorPubkey,
      plaintext: payload,
      tags: [
        ["p", _ticket.tutorPubkey],
        ...commonTags,
      ],
    }));

    tasks.push(this.nostr.sendEncrypted({
      recipientPubkey: _ticket.studentPubkey,
      plaintext: payload,
      tags: [
        ["p", _ticket.studentPubkey],
        ...commonTags,
      ],
    }));

    await Promise.all(tasks);
  }

  private extractSubject(plaintext: string): string {
    try {
      const parsed = JSON.parse(plaintext);
      return typeof parsed.subject === "string" ? parsed.subject : "Homework";
    } catch {
      return "Homework";
    }
  }

  private async buildHistory(ticket: Ticket): Promise<Array<{ role: "student" | "ai"; content: string }>> {
    const messages = await this.repo.getMessageHistory(ticket.rootEventId);
    return messages
      .filter((m) => m.role === "student" || m.role === "ai")
      .map((m) => ({
        role: m.role === "ai" ? "ai" as const : "student" as const,
        content: m.content,
      }));
  }
}
