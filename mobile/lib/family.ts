import { apiFetch } from "@/lib/api";
import type {
  AddPlaceholderBody,
  AddPlaceholderResponse,
  BlockMemberBody,
  FamilyMembersResponse,
  InviteMemberBody,
  InviteMemberResponse,
  UpdateMemberBody,
} from "@/types/api";

export function fetchFamilyMembers(): Promise<FamilyMembersResponse> {
  return apiFetch<FamilyMembersResponse>("/api/native/family/members");
}

export function inviteMember(
  body: InviteMemberBody
): Promise<InviteMemberResponse> {
  return apiFetch("/api/native/family/invite", { method: "POST", body });
}

export function updateMember(
  membershipId: string,
  body: UpdateMemberBody
): Promise<{ success: true; updated: boolean }> {
  return apiFetch(`/api/native/family/${membershipId}`, {
    method: "POST",
    body,
  });
}

export function removeMember(membershipId: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/family/${membershipId}/remove`, { method: "POST" });
}

export function blockMember(
  membershipId: string,
  body: BlockMemberBody = {}
): Promise<{ success: true }> {
  return apiFetch(`/api/native/family/${membershipId}/block`, {
    method: "POST",
    body,
  });
}

export function unblockMember(
  membershipId: string
): Promise<{ success: true }> {
  return apiFetch(`/api/native/family/${membershipId}/unblock`, {
    method: "POST",
  });
}

export function addPlaceholder(
  body: AddPlaceholderBody
): Promise<AddPlaceholderResponse> {
  return apiFetch("/api/native/family/placeholder", { method: "POST", body });
}
