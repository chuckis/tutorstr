import type { ILLMProvider, ReviewRequest, ReviewResult } from "../../domain/ports/ILLMProvider.js";
import { buildSystemPrompt, buildUserPrompt, parseLLMResponse } from "../../domain/services/LLMService.js";

interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
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

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${text}`);
    }

    const json = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = json.choices?.[0]?.message?.content ?? "";
    return parseLLMResponse(content);
  }
}
