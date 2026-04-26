import { apiFetch } from "@/lib/api";
import type { AiSuggestionResponse } from "@/types/api";

export function fetchAiSuggestion(): Promise<AiSuggestionResponse> {
  return apiFetch<AiSuggestionResponse>("/api/native/ai/suggest", {
    method: "POST",
  });
}
