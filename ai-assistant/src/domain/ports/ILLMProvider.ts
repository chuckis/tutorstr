export interface ReviewResult {
  status: "approved" | "needs_fix";
  feedback: string;
  suggestions: string[];
}

export type MessageContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface ReviewRequest {
  subject: string;
  content: string;
  language: string;
  history: Array<{ role: "student" | "ai"; content: string }>;
  images?: Array<{ url: string; mimeType?: string }>;
}

export interface ILLMProvider {
  reviewHomework(request: ReviewRequest): Promise<ReviewResult>;
}
