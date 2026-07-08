export interface AppConfig {
  nostrRelays: string[];
  botPrivateKey: string;
  openRouterApiKey: string;
  openRouterModels: string[];
  maxAiIterations: number;
}

export function loadConfig(): AppConfig {
  const nostrRelays = (process.env.NOSTR_RELAYS ?? "ws://localhost:5555")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const botPrivateKey = process.env.BOT_PRIVATE_KEY ?? "";
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  const modelsFromEnv = process.env.OPENROUTER_MODELS
    ? process.env.OPENROUTER_MODELS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const openRouterModels = modelsFromEnv.length > 0
    ? modelsFromEnv
    : [process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"];
  const maxAiIterations = Number(process.env.MAX_AI_ITERATIONS ?? "3");

  if (!botPrivateKey) throw new Error("BOT_PRIVATE_KEY is required");
  if (!openRouterApiKey) throw new Error("OPENROUTER_API_KEY is required");

  return {
    nostrRelays,
    botPrivateKey,
    openRouterApiKey,
    openRouterModels,
    maxAiIterations,
  };
}
