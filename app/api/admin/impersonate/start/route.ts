import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = { userId: string };

/**
 * Issue a magic-link action_link for the target user. The mobile / web
 * client opens that link in a hidden flow to mint a session for the
 * target user, stashing the original super-admin session under a
 * separate storage key so it can be restored on /impersonate/end.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const body = (await request.json().catch(() => ({}))) as Partial<Body>;
    if (!body.userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();

    const profileResponse = await admin
      .from("profiles")
      .select("email")
      .eq("id", body.userId)
      .maybeSingle();
    const email = (profileResponse.data as { email: string | null } | null)
      ?.email;
    if (!email) {
      return Response.json(
        { error: "Target user has no email" },
        { status: 400 }
      );
    }

    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error || !link.data) {
      return Response.json(
        { error: link.error?.message ?? "Failed to generate link" },
        { status: 500 }
      );
    }

    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "impersonate.start",
      targetUserId: body.userId,
    });

    return Response.json({
      success: true,
      actionLink: link.data.properties?.action_link ?? null,
      hashedToken: link.data.properties?.hashed_token ?? null,
      email,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
