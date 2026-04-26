import { apiFetch } from "@/lib/api";
import type {
  AutoScheduleSettings,
  SaveAutoScheduleBody,
} from "@/types/api";

export function fetchAutoScheduleSettings(): Promise<AutoScheduleSettings> {
  return apiFetch<AutoScheduleSettings>("/api/native/auto-schedule");
}

export function saveAutoScheduleSettings(
  body: SaveAutoScheduleBody
): Promise<{ success: true }> {
  return apiFetch("/api/native/auto-schedule", {
    method: "POST",
    body,
  });
}

export function declineAutoCall(
  callId: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/decline-auto`, {
    method: "POST",
  });
}

export function setMinorParentalConsent(
  membershipId: string,
  enabled: boolean
): Promise<{ success: true }> {
  return apiFetch(
    `/api/native/family/${membershipId}/parental-consent`,
    { method: "POST", body: { enabled } }
  );
}
