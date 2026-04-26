import { apiFetch } from "@/lib/api";
import type {
  CreatePromptBody,
  PromptsResponse,
  RespondPromptBody,
} from "@/types/api";

export function fetchPrompts(): Promise<PromptsResponse> {
  return apiFetch<PromptsResponse>("/api/native/prompts");
}

export function createPrompt(
  body: CreatePromptBody
): Promise<{ success: true; id: string }> {
  return apiFetch("/api/native/prompts", { method: "POST", body });
}

export function respondToPrompt(
  id: string,
  body: RespondPromptBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/prompts/${id}/respond`, {
    method: "POST",
    body,
  });
}

export function closePrompt(id: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/prompts/${id}/close`, { method: "POST" });
}
