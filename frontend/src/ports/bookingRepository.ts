import { Booking } from "../domain/booking";

export interface BookingRepository {
  getIncoming(userId: string): Promise<Booking[]>;
  getOutgoing(userId: string): Promise<Booking[]>;
  getById(id: string): Promise<Booking | null>;
  updateStatus(id: string, status: Booking["status"]): Promise<void>;
}
