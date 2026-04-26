import { apiFetch } from "@/lib/api";
import type {
  CreateRecurrenceBody,
  RecurrenceListResponse,
} from "@/types/api";

export function fetchRecurrenceRules(): Promise<RecurrenceListResponse> {
  return apiFetch<RecurrenceListResponse>("/api/native/recurrence");
}

export function createRecurrenceRule(
  body: CreateRecurrenceBody
): Promise<{ success: true; id: string; occurrencesScheduled: number }> {
  return apiFetch("/api/native/recurrence", { method: "POST", body });
}

export function cancelRecurrenceRule(
  id: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/recurrence/${id}/cancel`, { method: "POST" });
}
