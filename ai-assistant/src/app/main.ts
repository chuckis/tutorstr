import { mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { createDatabase } from "../adapters/db/Database.js";
import { TicketRepository } from "../adapters/db/TicketRepository.js";
import { NostrGateway } from "../adapters/nostr/NostrGateway.js";
import { OpenRouterProvider } from "../adapters/llm/OpenRouterProvider.js";
import { TicketService } from "../domain/services/TicketService.js";
import { createEventHandler } from "./eventHandler.js";

async function main() {
  const config = loadConfig();

  console.log("=== TutorHub AI Assistant ===");
  console.log(`Relays: ${config.nostrRelays.join(", ")}`);
  console.log(`LLM Models: ${config.openRouterModels}`);
  console.log(`Max AI iterations: ${config.maxAiIterations}`);

  process.env.NOSTR_RELAYS = config.nostrRelays.join(",");
  process.env.BOT_PRIVATE_KEY = config.botPrivateKey;

  mkdirSync("data", { recursive: true });
  const db = createDatabase({ path: "data/bot.db" });
  const ticketRepo = new TicketRepository(db);

  const nostr = new NostrGateway();
  await nostr.connect();

  const llm = new OpenRouterProvider({
    apiKey: config.openRouterApiKey,
    models: config.openRouterModels,
  });

  const ticketService = new TicketService(ticketRepo, llm, nostr, config.maxAiIterations);
  const handler = createEventHandler(ticketService);

  const unsubscribe = await nostr.subscribeHomeworkSubmissions(handler);

  console.log("[Main] Bot is running. Waiting for homework submissions...");

  process.on("SIGINT", async () => {
    console.log("\n[Main] Shutting down...");
    unsubscribe();
    await nostr.disconnect();
    db.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[Main] Shutting down...");
    unsubscribe();
    await nostr.disconnect();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Main] Fatal error:", err);
  process.exit(1);
});
