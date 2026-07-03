import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, parseLLMResponse } from "../src/domain/services/LLMService.js";

describe("LLMService", () => {
  describe("buildSystemPrompt", () => {
    it("returns Russian prompt for ru language", () => {
      const prompt = buildSystemPrompt("ru");
      expect(prompt).toContain("Tutorhub");
      expect(prompt).toContain("JSON");
    });

    it("returns English prompt for en language", () => {
      const prompt = buildSystemPrompt("en");
      expect(prompt).toContain("Tutorhub");
      expect(prompt).toContain("JSON");
    });

    it("returns Russian prompt for auto language", () => {
      const prompt = buildSystemPrompt("auto");
      expect(prompt).toContain("Tutorhub");
    });
  });

  describe("buildUserPrompt", () => {
    it("builds prompt with subject and content", () => {
      const prompt = buildUserPrompt({
        subject: "Math HW",
        content: "2+2=5",
        language: "en",
        history: [],
      });
      expect(prompt).toContain("Math HW");
      expect(prompt).toContain("2+2=5");
    });

    it("includes history when present", () => {
      const prompt = buildUserPrompt({
        subject: "Math HW",
        content: "fix: 2+2=4",
        language: "en",
        history: [{ role: "student", content: "2+2=5" }, { role: "ai", content: "check your math" }],
      });
      expect(prompt).toContain("2+2=5");
      expect(prompt).toContain("check your math");
    });
  });

  describe("parseLLMResponse", () => {
    it("parses approved JSON response", () => {
      const result = parseLLMResponse(
        '{"status": "approved", "feedback": "All correct!", "suggestions": []}',
      );
      expect(result.status).toBe("approved");
      expect(result.feedback).toBe("All correct!");
      expect(result.suggestions).toEqual([]);
    });

    it("parses needs_fix JSON response", () => {
      const result = parseLLMResponse(
        '{"status": "needs_fix", "feedback": "Error in line 5", "suggestions": ["Check the formula"]}',
      );
      expect(result.status).toBe("needs_fix");
      expect(result.feedback).toBe("Error in line 5");
      expect(result.suggestions).toEqual(["Check the formula"]);
    });

    it("strips markdown code fences", () => {
      const result = parseLLMResponse(
        "```json\n{\"status\": \"approved\", \"feedback\": \"OK\", \"suggestions\": []}\n```",
      );
      expect(result.status).toBe("approved");
    });

    it("returns needs_fix on unparseable response", () => {
      const result = parseLLMResponse("this is not json");
      expect(result.status).toBe("needs_fix");
      expect(result.feedback).toBeTruthy();
    });
  });
});
