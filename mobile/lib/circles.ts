import { apiFetch } from "@/lib/api";
import type { CirclesResponse } from "@/types/api";

export function fetchCircles(): Promise<CirclesResponse> {
  return apiFetch<CirclesResponse>("/api/native/circles");
}

export function setActiveCircle(circleId: string): Promise<{ success: true }> {
  return apiFetch("/api/native/circles/active", {
    method: "POST",
    body: { circleId },
  });
}
