import { apiFetch } from "@/lib/api";
import type {
  CallDetailResponse,
  CompleteCallBody,
  EditCallDetailsBody,
  RescheduleBody,
  RescheduleResponse,
  SaveLinkBody,
  SaveRecapBody,
  ScheduleCallBody,
  ScheduleCallResponse,
} from "@/types/api";

// M42 — spontaneous "ring now" call.
export interface RingResponse {
  success: true;
  callId: string;
  ringExpiresAt: string;
  participantCount: number;
  pushedTo: number;
}

export function ringFamilyMembers(input: {
  participantMembershipIds: string[];
  title?: string;
}): Promise<RingResponse> {
  return apiFetch<RingResponse>("/api/native/calls/ring", {
    method: "POST",
    body: input,
  });
}

export function answerIncomingCall(
  callId: string
): Promise<{ success: true; callId: string; alreadyLive?: boolean }> {
  return apiFetch(`/api/native/calls/${callId}/answer`, { method: "POST" });
}

export function declineIncomingCall(
  callId: string
): Promise<{ success: true; callId: string; alreadyClosed?: boolean }> {
  return apiFetch(`/api/native/calls/${callId}/decline`, { method: "POST" });
}

export function cancelOutgoingRing(
  callId: string
): Promise<{ success: true; callId: string; alreadyClosed?: boolean }> {
  return apiFetch(`/api/native/calls/${callId}/cancel-ring`, {
    method: "POST",
  });
}

export function fetchCallDetail(callId: string): Promise<CallDetailResponse> {
  return apiFetch<CallDetailResponse>(`/api/native/calls/${callId}`);
}

export function completeCall(
  callId: string,
  body: CompleteCallBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/complete`, {
    method: "POST",
    body,
  });
}

export function saveCallRecap(
  callId: string,
  body: SaveRecapBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/recap`, {
    method: "POST",
    body,
  });
}

export function saveCallLink(
  callId: string,
  body: SaveLinkBody
): Promise<{ success: true; meetingProvider: string | null; meetingUrl: string | null }> {
  return apiFetch(`/api/native/calls/${callId}/link`, {
    method: "POST",
    body,
  });
}

export function cancelCall(callId: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/cancel`, { method: "POST" });
}

export function scheduleCall(body: ScheduleCallBody): Promise<ScheduleCallResponse> {
  return apiFetch("/api/native/calls/schedule", {
    method: "POST",
    body,
  });
}

export function dismissRecovery(callId: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/recovery/dismiss`, {
    method: "POST",
  });
}

export function rescheduleCall(
  callId: string,
  body: RescheduleBody = {}
): Promise<RescheduleResponse> {
  return apiFetch(`/api/native/calls/${callId}/recovery/reschedule`, {
    method: "POST",
    body,
  });
}

export function editCallDetails(
  callId: string,
  body: EditCallDetailsBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/details`, {
    method: "POST",
    body,
  });
}

export function markReminderSent(callId: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/calls/${callId}/reminder-sent`, {
    method: "POST",
  });
}
