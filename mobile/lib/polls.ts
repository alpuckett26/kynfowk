import { apiFetch } from "@/lib/api";
import type { FamilyPoll, FamilyPollResult } from "@/types/api";

export function fetchActivePoll(): Promise<{ poll: FamilyPoll | null }> {
  return apiFetch("/api/native/polls/active");
}

export function fetchPollResults(): Promise<{ results: FamilyPollResult[] }> {
  return apiFetch("/api/native/polls/results");
}

export function respondToPoll(
  pollId: string,
  choice: "a" | "b"
): Promise<{ success: true }> {
  return apiFetch("/api/native/polls/respond", {
    method: "POST",
    body: { pollId, choice },
  });
}
