import { apiFetch } from "@/lib/api";
import type { FamilyMembersResponse } from "@/types/api";

export function fetchFamilyMembers(): Promise<FamilyMembersResponse> {
  return apiFetch<FamilyMembersResponse>("/api/native/family/members");
}
