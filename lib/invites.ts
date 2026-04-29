import type { User } from "@supabase/supabase-js";

import { createNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/product-insights";
import { hasSupabaseServiceRoleEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export async function claimPendingInvitesForUser(user: User) {
  const email = normalizeEmail(user.email);
  if (!email) {
    return [];
  }

  // Use the service-role client for the lookup + claim. The user-scoped
  // client can't see pending invites under RLS (they're not yet a member
  // of any circle), which silently dropped invitees on /onboarding
  // instead of attaching them to the inviting circle. Claiming an
  // invite addressed to your own verified email isn't a security
  // concern — the email match is the auth.
  if (!hasSupabaseServiceRoleEnv()) {
    return [];
  }
  const admin = createSupabaseAdminClient();

  const pendingResponse = await admin
    .from("family_memberships")
    .select("id, family_circle_id, display_name")
    .eq("status", "invited")
    .is("user_id", null)
    .ilike("invite_email", email);

  const pendingMemberships = pendingResponse.data ?? [];
  if (!pendingMemberships.length) {
    return [];
  }

  const claimedMemberships: Array<{
    id: string;
    family_circle_id: string;
    display_name: string;
  }> = [];

  for (const membership of pendingMemberships) {
    const updateResponse = await admin
      .from("family_memberships")
      .update({
        user_id: user.id,
        status: "active"
      })
      .eq("id", membership.id)
      .is("user_id", null)
      .eq("status", "invited")
      .select("id, family_circle_id, display_name")
      .single();

    if (!updateResponse.error && updateResponse.data) {
      claimedMemberships.push(updateResponse.data);
    }
  }

  if (claimedMemberships.length) {
    // Profile + activity inserts use the user's own session so RLS
    // applies normally — the user is now an active member, so policies
    // permit reads/writes scoped to their circles.
    const supabase = await createSupabaseServerClient();
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ??
        claimedMemberships[0].display_name,
      timezone: "America/Chicago"
    });

    await admin.from("family_activity").insert(
      claimedMemberships.map((membership) => ({
        family_circle_id: membership.family_circle_id,
        actor_membership_id: membership.id,
        activity_type: "member_joined",
        summary: `${membership.display_name} joined the Family Circle.`
      }))
    );

    for (const membership of claimedMemberships) {
      await trackProductEvent(supabase, {
        eventName: "invite_claimed",
        userId: user.id,
        familyCircleId: membership.family_circle_id
      });

      const recipientResponse = await admin
        .from("family_memberships")
        .select("user_id, display_name, family_circles(name), profiles(email, timezone)")
        .eq("family_circle_id", membership.family_circle_id)
        .eq("status", "active");

      const familyCircleRecord = recipientResponse.data?.[0]?.family_circles as
        | { name: string }[]
        | { name: string }
        | null;
      const circleName = Array.isArray(familyCircleRecord)
        ? familyCircleRecord[0]?.name ?? "Family Circle"
        : familyCircleRecord?.name ?? "Family Circle";

      await createNotifications(supabase, {
        familyCircleId: membership.family_circle_id,
        type: "invite_claimed",
        title: `${membership.display_name} joined ${circleName}`,
        body: `${membership.display_name} claimed their invite and is now part of the Family Circle.`,
        ctaLabel: "Open dashboard",
        ctaHref: "/dashboard",
        dedupeKeyPrefix: `invite-claimed:${membership.id}`,
        recipients: (recipientResponse.data ?? [])
          .filter((recipient) => recipient.user_id)
          .map((recipient) => {
            const profileRecord = recipient.profiles as
              | { email: string | null; timezone: string }[]
              | { email: string | null; timezone: string }
              | null;

            return {
              userId: recipient.user_id as string,
              displayName: recipient.display_name,
              email: Array.isArray(profileRecord)
                ? profileRecord[0]?.email ?? null
                : profileRecord?.email ?? null,
              timezone: Array.isArray(profileRecord)
                ? profileRecord[0]?.timezone ?? "America/Chicago"
                : profileRecord?.timezone ?? "America/Chicago"
            };
          })
      });
    }
  }

  return claimedMemberships;
}

export async function getPostAuthRedirectPath(user: User) {
  const claimedMemberships = await claimPendingInvitesForUser(user);
  if (claimedMemberships.length) {
    return "/dashboard?status=joined-circle";
  }

  // Use admin client here too — the user-scoped client may return empty
  // immediately after sign-up if RLS hasn't picked up the new auth.uid()
  // yet, which would erroneously redirect existing members to onboarding.
  if (!hasSupabaseServiceRoleEnv()) {
    const supabase = await createSupabaseServerClient();
    const membershipResponse = await supabase
      .from("family_memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return membershipResponse.data ? "/dashboard" : "/onboarding";
  }

  const admin = createSupabaseAdminClient();
  const membershipResponse = await admin
    .from("family_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return membershipResponse.data ? "/dashboard" : "/onboarding";
}
