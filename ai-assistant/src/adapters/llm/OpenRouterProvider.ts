import type { ILLMProvider, ReviewRequest, ReviewResult, MessageContentPart } from "../../domain/ports/ILLMProvider.js";
import { buildSystemPrompt, buildUserPrompt, parseLLMResponse } from "../../domain/services/LLMService.js";

interface OpenRouterConfig {
  apiKey: string;
  models: string[];
  baseUrl?: string;
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class OpenRouterProvider implements ILLMProvider {
  private readonly config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = {
      baseUrl: "https://openrouter.ai/api/v1",
      ...config,
    };
  }

  async reviewHomework(request: ReviewRequest): Promise<ReviewResult> {
    const systemPrompt = buildSystemPrompt(request.language);
    const userPrompt = buildUserPrompt(request);
    const hasImages = !!request.images?.length;
    let lastError: unknown;

    for (const model of this.config.models) {
      if (hasImages && !this.supportsVision(model)) {
        console.warn(`[OpenRouter] Skipping "${model}" — no vision support`);
        continue;
      }

      try {
        return await this.tryModel(model, systemPrompt, userPrompt, request);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status ?? 0;
        const msg = err instanceof Error ? err.message : String(err);

        if (this.isRetryable(err)) {
          console.warn(`[OpenRouter] Model "${model}" failed (retryable): ${msg.slice(0, 200)}. Trying next...`);
          lastError = err;
          await sleep(1000);
          continue;
        }

        throw err;
      }
    }

    const tried = this.config.models.join(", ");
    console.error(`[OpenRouter] All models exhausted (${tried}). Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    throw lastError ?? new Error(`All OpenRouter models exhausted: ${tried}`);
  }

  private async tryModel(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    request: ReviewRequest,
  ): Promise<ReviewResult> {
    const messages: Array<{ role: "system" | "user"; content: string | MessageContentPart[] }> = [
      { role: "system", content: systemPrompt },
    ];

    if (request.images?.length) {
      const parts: MessageContentPart[] = [
        { type: "text", text: userPrompt },
        ...request.images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: img.url },
        })),
      ];
      messages.push({ role: "user" as const, content: parts });
    } else {
      messages.push({ role: "user" as const, content: userPrompt });
    }

    const body = {
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    };

    console.log(`[OpenRouter] Sending request — model: ${model}, subject: "${request.subject}", lang: ${request.language}, history: ${request.history.length} msgs, images: ${request.images?.length ?? 0}`);

    const start = Date.now();
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const elapsed = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      console.error(`[OpenRouter] Model "${model}" error ${response.status} after ${elapsed}ms: ${text.slice(0, 200)}`);
      const err = new Error(`OpenRouter API error ${response.status}: ${text}`);
      (err as { status?: number }).status = response.status;
      throw err;
    }

    const json = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = json.choices?.[0]?.message?.content ?? "";
    const result = parseLLMResponse(content);

    console.log(`[OpenRouter] Model "${model}" response in ${elapsed}ms — status: ${result.status}, feedback: ${result.feedback.length} chars, suggestions: ${result.suggestions.length}`);
    return result;
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof TypeError && err.message === "fetch failed") {
      return true;
    }
    const status = (err as { status?: number })?.status ?? 0;
    if (isRetryableHttpStatus(status)) return true;

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out") || msg.includes("abort")) return true;

    return false;
  }

  private supportsVision(model: string): boolean {
    const visionPatterns = [
      "gemini",
      "gpt-4o",
      "gpt-4-vision",
      "claude-3",
      "claude-3.5",
      "llama-3.2-11b",
      "llama-3.2-90b",
      "reka",
    ];
    return visionPatterns.some((p) => model.toLowerCase().includes(p));
  }
}
