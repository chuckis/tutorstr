import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterProvider } from "../src/adapters/llm/OpenRouterProvider.js";

const TEST_API_KEY = "sk-or-v1-test123";
const TEST_MODEL = "openai/gpt-4o-mini";

function createProvider(models?: string[]) {
  return new OpenRouterProvider({ apiKey: TEST_API_KEY, models: models ?? [TEST_MODEL] });
}

describe("OpenRouterProvider", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("sends correct request to OpenRouter API", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"status":"approved","feedback":"All correct!","suggestions":[]}' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const provider = createProvider();
    const result = await provider.reviewHomework({
      subject: "Math HW",
      content: "2+2=4",
      language: "en",
      history: [],
    });

    expect(result.status).toBe("approved");
    expect(result.feedback).toBe("All correct!");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0]!;
    expect(url).toContain("openrouter.ai/api/v1/chat/completions");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toMatchObject({
      Authorization: `Bearer ${TEST_API_KEY}`,
    });

    const body = JSON.parse(opts.body as string);
    expect(body.model).toBe(TEST_MODEL);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content).toContain("Math HW");
  });

  it("returns needs_fix when LLM response has needs_fix status", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"status":"needs_fix","feedback":"Error in line 3","suggestions":["Check syntax"]}' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const provider = createProvider();
    const result = await provider.reviewHomework({
      subject: "Code Review",
      content: "console.log('hello'",
      language: "en",
      history: [],
    });

    expect(result.status).toBe("needs_fix");
    expect(result.feedback).toBe("Error in line 3");
    expect(result.suggestions).toEqual(["Check syntax"]);
  });

  it("throws on non-200 response", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Rate limited", { status: 429, statusText: "Too Many Requests" }),
    );

    const provider = createProvider();
    await expect(
      provider.reviewHomework({ subject: "Math", content: "test", language: "en", history: [] }),
    ).rejects.toThrow("OpenRouter API error 429");
  });

  it("sends history messages when present", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"status":"approved","feedback":"OK","suggestions":[]}' } }],
        }),
        { status: 200 },
      ),
    );

    const provider = createProvider();
    await provider.reviewHomework({
      subject: "Math",
      content: "fixed: 2+2=4",
      language: "en",
      history: [
        { role: "student", content: "2+2=5" },
        { role: "ai", content: "check your math" },
      ],
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
    expect(body.messages[1].content).toContain("2+2=5");
    expect(body.messages[1].content).toContain("check your math");
  });

  it("includes Russian system prompt for ru language", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"status":"approved","feedback":"OK","suggestions":[]}' } }],
        }),
        { status: 200 },
      ),
    );

    const provider = createProvider();
    await provider.reviewHomework({
      subject: "Math",
      content: "test",
      language: "ru",
      history: [],
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
    expect(body.messages[0].content).toContain("Ты — ИИ-ассистент репетитора");
  });
});
