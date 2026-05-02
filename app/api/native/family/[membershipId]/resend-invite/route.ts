import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { sendFamilyInviteEmail } from "@/lib/branded-email";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/env";

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { membershipId } = await context.params;

    if (!hasSupabaseServiceRoleEnv()) {
      return Response.json(
        {
          error:
            "Server isn't configured to send invite emails (SUPABASE_SERVICE_ROLE_KEY missing).",
        },
        { status: 500 }
      );
    }

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can resend invites." },
        { status: 403 }
      );
    }

    const membershipResponse = await supabase
      .from("family_memberships")
      .select("id, display_name, invite_email, status, relationship_label")
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id)
      .maybeSingle();
    if (
      !membershipResponse.data ||
      membershipResponse.data.status !== "invited" ||
      !membershipResponse.data.invite_email
    ) {
      return Response.json(
        { error: "That member is not in an invited state." },
        { status: 400 }
      );
    }
    const pending = membershipResponse.data;

    const admin = createSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
    const acceptUrl = new URL(`${siteUrl}/auth/accept-invite`);
    acceptUrl.searchParams.set("circle", family.circle.name);
    acceptUrl.searchParams.set("from", family.membership.display_name);
    acceptUrl.searchParams.set("email", pending.invite_email!);

    const timeoutMs = 8000;
    const inviteResponse = await Promise.race([
      sendFamilyInviteEmail({
        email: pending.invite_email!,
        displayName: pending.display_name,
        inviterName: family.membership.display_name,
        circleName: family.circle.name,
        relationshipLabel: pending.relationship_label ?? null,
        acceptUrlBase: acceptUrl.toString(),
        adminClient: admin,
      }),
      new Promise<{ status: "failed"; errorMessage: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: "failed",
              errorMessage: `Supabase Auth invite did not respond in ${timeoutMs}ms.`,
            }),
          timeoutMs
        )
      ),
    ]);

    if (inviteResponse.status === "failed") {
      const lower = (inviteResponse.errorMessage ?? "").toLowerCase();
      if (lower.includes("already") || lower.includes("exists")) {
        return Response.json(
          { error: "That email already has an account.", alreadyClaimed: true },
          { status: 409 }
        );
      }
      return Response.json(
        { error: inviteResponse.errorMessage ?? "Failed to send invite." },
        { status: 502 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "invite_resent",
      summary: `A fresh invite was sent to ${pending.display_name}.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
