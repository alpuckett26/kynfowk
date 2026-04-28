import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
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
      .select("id, display_name, invite_email, status")
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

    const inviteCall = admin.auth.admin.inviteUserByEmail(
      pending.invite_email!,
      {
        data: {
          full_name: pending.display_name,
          family_circle_name: family.circle.name,
          inviter_name: family.membership.display_name,
        },
        redirectTo: acceptUrl.toString(),
      }
    );
    const timeoutMs = 8000;
    const inviteResponse = await Promise.race([
      inviteCall,
      new Promise<{ error: { message: string }; data: null }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              error: {
                message: `Supabase Auth invite did not respond in ${timeoutMs}ms.`,
              },
              data: null,
            }),
          timeoutMs
        )
      ),
    ]);

    if (inviteResponse.error) {
      const lower = inviteResponse.error.message.toLowerCase();
      if (lower.includes("already") || lower.includes("exists")) {
        return Response.json(
          { error: "That email already has an account.", alreadyClaimed: true },
          { status: 409 }
        );
      }
      return Response.json(
        { error: inviteResponse.error.message },
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
