import type { ReviewRequest, ReviewResult } from "../ports/ILLMProvider.js";

export function parseSubmissionContent(plaintext: string): { content: string; images: Array<{ url: string; mimeType?: string }> } {
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed && typeof parsed === "object") {
      const textContent = typeof parsed.text === "string" ? parsed.text : plaintext;
      const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
      const images = attachments.filter(
        (a: { url?: string; mimeType?: string }) => a.url && a.mimeType?.startsWith("image/"),
      ).map((a: { url: string; mimeType?: string }) => ({ url: a.url, mimeType: a.mimeType }));
      return { content: textContent, images };
    }
  } catch {
    // not JSON — plain text
  }
  return { content: plaintext, images: [] };
}

export function buildSystemPrompt(language: string): string {
  const ru = language === "ru" || language === "auto";

  return ru
    ? `Ты — ИИ-ассистент репетитора на платформе Tutorhub.

Твоя задача — проверять домашние задания студентов и давать обратную связь.

Правила:
1. Проверь корректность решения.
2. Если есть ошибки — укажи на них конкретно (строки, шаги).
3. Если всё верно — подтверди.
4. Не решай задачу за студента — только направляй.
5. Отвечай на том же языке, что и задание.

Формат ответа (строгий JSON, без markdown):
{"status": "approved|needs_fix", "feedback": "текст", "suggestions": ["совет1", "совет2"]}`
    : `You are an AI teaching assistant on Tutorhub platform.

Your job is to review student homework and provide feedback.

Rules:
1. Check correctness of the solution.
2. If there are errors — point them out specifically (lines, steps).
3. If everything is correct — confirm.
4. Don't solve the problem for the student — only guide.
5. Respond in the same language as the assignment.

Response format (strict JSON, no markdown):
{"status": "approved|needs_fix", "feedback": "text", "suggestions": ["tip1", "tip2"]}`;
}

export function buildUserPrompt(request: ReviewRequest): string {
  let prompt = `Subject: ${request.subject}\n\nStudent submission:\n${request.content}\n`;

  if (request.history.length > 0) {
    prompt += "\n--- Previous conversation ---\n";
    for (const msg of request.history) {
      const prefix = msg.role === "student" ? "Student" : "AI";
      prompt += `${prefix}: ${msg.content}\n`;
    }
    prompt += "--- End of history ---\n";
  }

  return prompt;
}

export function parseLLMResponse(response: string): ReviewResult {
  const cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const status = parsed.status === "approved" ? "approved" : "needs_fix";
    return {
      status,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: unknown) => typeof s === "string")
        : [],
    };
  } catch {
    return {
      status: "needs_fix",
      feedback: "Не удалось распарсить ответ. Пожалуйста, проверьте решение вручную.",
      suggestions: [],
    };
  }
}
