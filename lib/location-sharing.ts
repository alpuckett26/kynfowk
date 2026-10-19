import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyRelationship } from "@/lib/relationship-classifier";
import { createNotifications } from "@/lib/notifications";

export type LocationShare = {
  id: string;
  membershipId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  sharedUntil: string;
  updatedAt: string;
  isViewer: boolean;
};

type Member = {
  id: string;
  user_id: string | null;
  display_name: string;
  relationship_label: string | null;
  role: "owner" | "member";
  status: string;
  blocked_at: string | null;
  profiles: { email: string | null; timezone: string | null } | { email: string | null; timezone: string | null }[] | null;
};

function profileOf(member: Member) {
  return Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
}

export function isImmediateLocationRecipient(input: {
  viewerMembershipId: string;
  viewerRole: "owner" | "member";
  viewerRelationshipLabel: string | null;
  memberId: string;
  memberRole: "owner" | "member";
  userId: string | null;
  relationshipLabel: string | null;
  explicitlyImmediate?: boolean;
}) {
  return input.memberId !== input.viewerMembershipId
    && Boolean(input.userId)
    && (
      input.explicitlyImmediate === true
      || (input.viewerRole === "owner" && classifyRelationship(input.relationshipLabel).tier === "immediate")
      || (input.memberRole === "owner" && classifyRelationship(input.viewerRelationshipLabel).tier === "immediate")
    );
}

export function getLocationShareValidationError(input: {
  latitude: number;
  longitude: number;
  durationHours: number;
}) {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) return "That latitude is not valid.";
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) return "That longitude is not valid.";
  if (![1, 8, 24].includes(input.durationHours)) return "Choose a 1, 8, or 24 hour sharing window.";
  return null;
}

async function getContext(supabase: SupabaseClient, userId: string) {
  const viewerResponse = await supabase
    .from("family_memberships")
    .select("id, family_circle_id, display_name, role, relationship_label")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("blocked_at", null)
    .limit(1)
    .maybeSingle();
  if (viewerResponse.error) throw new Error(viewerResponse.error.message);
  if (!viewerResponse.data) return null;

  const membersResponse = await supabase
    .from("family_memberships")
    .select("id, user_id, display_name, relationship_label, role, status, blocked_at, profiles(email, timezone)")
    .eq("family_circle_id", viewerResponse.data.family_circle_id)
    .eq("status", "active")
    .is("blocked_at", null);
  if (membersResponse.error) throw new Error(membersResponse.error.message);

  const [edgesResponse, viewerUnitsResponse] = await Promise.all([
    supabase
      .from("relationship_edges")
      .select("source_membership_id, target_membership_id, kind")
      .eq("family_circle_id", viewerResponse.data.family_circle_id)
      .or(`source_membership_id.eq.${viewerResponse.data.id},target_membership_id.eq.${viewerResponse.data.id}`),
    supabase.from("family_unit_members").select("family_unit_id").eq("membership_id", viewerResponse.data.id),
  ]);
  const immediateKinds = new Set(["parent", "child", "spouse", "sibling", "step_parent", "step_child", "guardian", "ward", "partner"]);
  const explicitImmediateIds = new Set<string>();
  for (const edge of edgesResponse.data ?? []) {
    if (!immediateKinds.has(edge.kind)) continue;
    explicitImmediateIds.add(edge.source_membership_id === viewerResponse.data.id ? edge.target_membership_id : edge.source_membership_id);
  }
  const unitIds = (viewerUnitsResponse.data ?? []).map((item) => item.family_unit_id);
  if (unitIds.length) {
    const unitMembersResponse = await supabase.from("family_unit_members").select("membership_id").in("family_unit_id", unitIds);
    for (const unitMember of unitMembersResponse.data ?? []) explicitImmediateIds.add(unitMember.membership_id);
  }

  return {
    viewer: viewerResponse.data,
    members: (membersResponse.data ?? []) as unknown as Member[],
    explicitImmediateIds,
  };
}

export async function getLocationShares(supabase: SupabaseClient, userId: string) {
  const context = await getContext(supabase, userId);
  if (!context) return { needsOnboarding: true as const, viewerShare: null, shares: [] };

  const response = await supabase
    .from("member_location_shares")
    .select("id, membership_id, latitude, longitude, accuracy_meters, shared_until, updated_at")
    .eq("family_circle_id", context.viewer.family_circle_id)
    .gt("shared_until", new Date().toISOString())
    .order("updated_at", { ascending: false });
  if (response.error) throw new Error(response.error.message);

  const names = new Map(context.members.map((member) => [member.id, member.display_name]));
  const shares: LocationShare[] = (response.data ?? []).map((share) => ({
    id: share.id,
    membershipId: share.membership_id,
    displayName: names.get(share.membership_id) ?? "Family member",
    latitude: share.latitude,
    longitude: share.longitude,
    accuracyMeters: share.accuracy_meters,
    sharedUntil: share.shared_until,
    updatedAt: share.updated_at,
    isViewer: share.membership_id === context.viewer.id,
  }));

  return {
    needsOnboarding: false as const,
    viewerShare: shares.find((share) => share.isViewer) ?? null,
    shares,
  };
}

export async function shareLocation(
  supabase: SupabaseClient,
  userId: string,
  input: { latitude: number; longitude: number; accuracyMeters?: number | null; durationHours: number }
) {
  const validationError = getLocationShareValidationError(input);
  if (validationError) throw new Error(validationError);

  const context = await getContext(supabase, userId);
  if (!context) throw new Error("Create or join a Family Circle before sharing your location.");

  const recipients = context.members.filter((member) => isImmediateLocationRecipient({
    viewerMembershipId: context.viewer.id,
    viewerRole: context.viewer.role,
    viewerRelationshipLabel: context.viewer.relationship_label,
    memberId: member.id,
    memberRole: member.role,
    userId: member.user_id,
    relationshipLabel: member.relationship_label,
    explicitlyImmediate: context.explicitImmediateIds.has(member.id),
  }));
  const existing = await supabase
    .from("member_location_shares")
    .select("id, shared_until")
    .eq("membership_id", context.viewer.id)
    .maybeSingle();
  const wasActive = existing.data && new Date(existing.data.shared_until).getTime() > Date.now();
  const sharedUntil = new Date(Date.now() + input.durationHours * 60 * 60 * 1000).toISOString();

  const upsert = await supabase.from("member_location_shares").upsert({
    family_circle_id: context.viewer.family_circle_id,
    membership_id: context.viewer.id,
    user_id: userId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_meters: input.accuracyMeters ?? null,
    recipient_membership_ids: recipients.map((member) => member.id),
    shared_until: sharedUntil,
  }, { onConflict: "membership_id" });
  if (upsert.error) throw new Error(upsert.error.message);

  if (!wasActive && recipients.length) {
    await createNotifications(supabase as never, {
      familyCircleId: context.viewer.family_circle_id,
      type: "location_shared",
      title: `${context.viewer.display_name} shared their location`,
      body: `A little peace of mind for the family. This location is available for ${input.durationHours} ${input.durationHours === 1 ? "hour" : "hours"}.`,
      ctaLabel: "See family locations",
      ctaHref: "/location",
      dedupeKeyPrefix: `location-shared:${context.viewer.id}:${Date.now()}`,
      recipients: recipients.map((member) => ({
        userId: member.user_id!,
        displayName: member.display_name,
        email: profileOf(member)?.email ?? null,
        timezone: profileOf(member)?.timezone ?? "America/Chicago",
      })),
    });
  }

  return { success: true as const, sharedUntil, recipientCount: recipients.length };
}

export async function stopLocationSharing(supabase: SupabaseClient, userId: string) {
  const response = await supabase.from("member_location_shares").delete().eq("user_id", userId);
  if (response.error) throw new Error(response.error.message);
  return { success: true as const };
}
