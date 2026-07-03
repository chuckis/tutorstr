export interface ReviewResult {
  status: "approved" | "needs_fix";
  feedback: string;
  suggestions: string[];
}

export interface ReviewRequest {
  subject: string;
  content: string;
  language: string;
  history: Array<{ role: "student" | "ai"; content: string }>;
}

export interface ILLMProvider {
  reviewHomework(request: ReviewRequest): Promise<ReviewResult>;
}
