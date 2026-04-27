import { apiFetch } from "@/lib/api";
import type {
  CreateCrossCircleLinkBody,
  CrossCircleListResponse,
} from "@/types/api";

export function fetchCrossCircleLinks(): Promise<CrossCircleListResponse> {
  return apiFetch<CrossCircleListResponse>("/api/native/cross-circle-links");
}

export function createCrossCircleLink(
  body: CreateCrossCircleLinkBody
): Promise<{ success: true; id: string }> {
  return apiFetch("/api/native/cross-circle-links", {
    method: "POST",
    body,
  });
}

export function approveCrossCircleLink(
  id: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/cross-circle-links/${id}/approve`, {
    method: "POST",
  });
}

export function declineCrossCircleLink(
  id: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/cross-circle-links/${id}/decline`, {
    method: "POST",
  });
}

export function deleteCrossCircleLink(
  id: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/cross-circle-links/${id}`, {
    method: "DELETE",
  });
}
