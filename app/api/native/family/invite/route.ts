import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/env";

type Body = {
  displayName?: string;
  inviteEmail?: string;
  relationshipLabel?: string;
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can invite." },
        { status: 403 }
      );
    }

    const displayName = (body.displayName ?? "").trim();
    const inviteEmail = (body.inviteEmail ?? "").trim().toLowerCase();
    const relationshipLabel = (body.relationshipLabel ?? "").trim();

    if (!displayName || !inviteEmail) {
      return Response.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      return Response.json(
        { error: "That email doesn't look right." },
        { status: 400 }
      );
    }

    // Idempotency — same circle + email = same invite, not a new row.
    // Prevents duplicate memberships when a slow network makes the user
    // tap "Send invite" twice.
    const existing = await supabase
      .from("family_memberships")
      .select("id, status")
      .eq("family_circle_id", family.circle.id)
      .eq("invite_email", inviteEmail)
      .limit(1)
      .maybeSingle();

    let membershipId: string;
    let alreadyExists = false;
    if (existing.data) {
      membershipId = existing.data.id;
      alreadyExists = true;
      if (existing.data.status === "active") {
        return Response.json({
          success: true,
          membershipId,
          alreadyClaimed: true,
          inviteEmailSent: false,
          inviteEmailWarning: "This person is already an active member.",
        });
      }
    } else {
      const memberInsert = await supabase
        .from("family_memberships")
        .insert({
          family_circle_id: family.circle.id,
          display_name: displayName,
          invite_email: inviteEmail,
          relationship_label: relationshipLabel || null,
          status: "invited",
          role: "member",
        })
        .select("id")
        .single();
      if (memberInsert.error || !memberInsert.data) {
        return Response.json(
          { error: memberInsert.error?.message ?? "Couldn't add member." },
          { status: 400 }
        );
      }
      membershipId = memberInsert.data.id;
    }

    let alreadyClaimed = false;
    let inviteEmailWarning: string | null = null;
    let inviteEmailSent = false;
    if (hasSupabaseServiceRoleEnv()) {
      const admin = createSupabaseAdminClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
      const acceptUrl = new URL(`${siteUrl}/auth/accept-invite`);
      acceptUrl.searchParams.set("circle", family.circle.name);
      acceptUrl.searchParams.set("from", family.membership.display_name);
      acceptUrl.searchParams.set("email", inviteEmail);
      if (relationshipLabel) acceptUrl.searchParams.set("relationship", relationshipLabel);

      const inviteCall = admin.auth.admin.inviteUserByEmail(inviteEmail, {
        data: {
          full_name: displayName,
          family_circle_name: family.circle.name,
          inviter_name: family.membership.display_name,
          relationship_label: relationshipLabel || undefined,
        },
        redirectTo: acceptUrl.toString(),
      });
      const timeoutMs = 8000;
      const inviteResponse = await Promise.race([
        inviteCall,
        new Promise<{ error: { message: string }; data: null }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: {
                  message: `Supabase Auth invite did not respond in ${timeoutMs}ms (likely SMTP/redirect-allow-list config).`,
                },
                data: null,
              }),
            timeoutMs
          )
        ),
      ]);
      if (inviteResponse.error) {
        const msg = inviteResponse.error.message;
        const lower = msg.toLowerCase();
        if (lower.includes("already") || lower.includes("exists")) {
          alreadyClaimed = true;
        } else {
          inviteEmailWarning = msg;
          console.error("[invite] Supabase Auth invite error:", msg);
        }
      } else {
        inviteEmailSent = true;
      }
    } else {
      inviteEmailWarning =
        "Server isn't configured to send invite emails (SUPABASE_SERVICE_ROLE_KEY missing).";
    }

    if (!alreadyExists) {
      await supabase.from("family_activity").insert({
        family_circle_id: family.circle.id,
        actor_membership_id: family.membership.id,
        activity_type: "members_invited",
        summary: `${displayName} was invited to join the Family Circle.`,
      });
    }

    return Response.json({
      success: true,
      membershipId,
      alreadyClaimed,
      alreadyExists,
      inviteEmailSent,
      inviteEmailWarning,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
