import { apiFetch } from "@/lib/api";
import type {
  CreateFamilyUnitBody,
  CreateRelationshipBody,
  RelationshipsResponse,
  UpdateFamilyUnitBody,
} from "@/types/api";

export function fetchRelationships(): Promise<RelationshipsResponse> {
  return apiFetch<RelationshipsResponse>("/api/native/relationships");
}

export function createRelationship(
  body: CreateRelationshipBody
): Promise<{ success: true; id: string }> {
  return apiFetch("/api/native/relationships/edge", { method: "POST", body });
}

export function deleteRelationship(
  id: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/relationships/edge/${id}`, { method: "DELETE" });
}

export function createFamilyUnit(
  body: CreateFamilyUnitBody
): Promise<{ success: true; id: string }> {
  return apiFetch("/api/native/family-units", { method: "POST", body });
}

export function updateFamilyUnit(
  id: string,
  body: UpdateFamilyUnitBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/family-units/${id}`, { method: "POST", body });
}

export function deleteFamilyUnit(id: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/family-units/${id}`, { method: "DELETE" });
}
