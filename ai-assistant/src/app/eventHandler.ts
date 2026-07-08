import type { DecryptedEvent } from "../domain/ports/INostrGateway.js";
import { TicketService } from "../domain/services/TicketService.js";

export function createEventHandler(ticketService: TicketService) {
  return async (ev: DecryptedEvent): Promise<void> => {
    const { isReply, rootEventId, studentPubkey, event } = ev;

    console.log(
      `[EventHandler] ${isReply ? "Reply" : "New submission"} from ${studentPubkey.slice(0, 8)}... ` +
      `root: ${rootEventId?.slice(0, 8) ?? "none"} event: ${event.id.slice(0, 8)}`,
    );

    try {
      if (isReply && rootEventId) {
        await ticketService.processStudentReply(ev);
      } else {
        await ticketService.processNewSubmission(ev);
      }
      console.log(`[EventHandler] Done processing ${event.id.slice(0, 8)}`);
    } catch (err) {
      console.error(`[EventHandler] Error processing event ${event.id.slice(0, 8)}:`, err);
    }
  };
}
