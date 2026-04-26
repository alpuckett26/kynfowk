import { apiFetch } from "@/lib/api";
import type {
  OnboardingBody,
  OnboardingResponse,
  ProfileResponse,
  SaveFeedbackBody,
  SaveProfileBody,
} from "@/types/api";

export function fetchProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/api/native/profile");
}

export function saveProfile(body: SaveProfileBody): Promise<{ success: true }> {
  return apiFetch("/api/native/profile", { method: "POST", body });
}

export function completeOnboarding(
  body: OnboardingBody
): Promise<OnboardingResponse> {
  return apiFetch("/api/native/onboarding", { method: "POST", body });
}

export function sendFeedback(body: SaveFeedbackBody): Promise<{ success: true }> {
  return apiFetch("/api/native/feedback", { method: "POST", body });
}
