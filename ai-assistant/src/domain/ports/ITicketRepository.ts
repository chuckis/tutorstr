import type { Ticket, Message } from "../entities/Ticket.js";
import type { TicketStatus } from "../entities/Ticket.js";

export interface ITicketRepository {
  save(ticket: Ticket): Promise<void>;
  findByRootEventId(rootEventId: string): Promise<Ticket | null>;
  findActiveByStudent(studentPubkey: string): Promise<Ticket[]>;
  updateStatus(rootEventId: string, status: TicketStatus): Promise<void>;
  updateIteration(rootEventId: string, iteration: number): Promise<void>;
  saveMessage(msg: Message): Promise<void>;
  getMessageHistory(rootEventId: string): Promise<Message[]>;
}
