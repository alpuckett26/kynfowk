import { apiFetch } from "@/lib/api";
import type {
  PrayerListResponse,
  PrayerStatus,
} from "@/types/api";

export function fetchPrayerIntentions(): Promise<PrayerListResponse> {
  return apiFetch<PrayerListResponse>("/api/native/prayer");
}

export function postPrayerIntention(
  body: string
): Promise<{ success: true; id: string }> {
  return apiFetch("/api/native/prayer", {
    method: "POST",
    body: { body },
  });
}

export function respondToPrayer(
  id: string,
  message: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/prayer/${id}/respond`, {
    method: "POST",
    body: { message },
  });
}

export function setPrayerStatus(
  id: string,
  status: PrayerStatus
): Promise<{ success: true }> {
  return apiFetch(`/api/native/prayer/${id}/status`, {
    method: "POST",
    body: { status },
  });
}
